import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseICalDate(dateStr) {
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  if (dateStr.includes('T')) {
    const date = dateStr.split('T')[0];
    return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  }
  const cleanDate = dateStr.replace('Z', '').split('T')[0];
  if (cleanDate.length === 8) {
    return `${cleanDate.slice(0, 4)}-${cleanDate.slice(4, 6)}-${cleanDate.slice(6, 8)}`;
  }
  return dateStr;
}

function parseICalContent(icalContent) {
  const events = [];
  const lines = icalContent.split(/\r?\n/);
  
  let currentEvent = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].slice(1);
    }
    
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT') && currentEvent) {
      if (currentEvent.uid && currentEvent.dtstart && currentEvent.dtend) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        let key = line.slice(0, colonIndex);
        const value = line.slice(colonIndex + 1);
        
        if (key.includes(';')) {
          key = key.split(';')[0];
        }
        
        switch (key) {
          case 'UID':
            currentEvent.uid = value;
            break;
          case 'SUMMARY':
            currentEvent.summary = value;
            break;
          case 'DTSTART':
            currentEvent.dtstart = parseICalDate(value);
            break;
          case 'DTEND':
            currentEvent.dtend = parseICalDate(value);
            break;
          case 'DESCRIPTION':
            currentEvent.description = value;
            break;
        }
      }
    }
  }
  
  return events;
}

function calculateNights(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

function calculateTotalAmount(accommodation, checkIn, checkOut) {
  const nights = calculateNights(checkIn, checkOut);
  const dailyRate = accommodation.base_price || 0;
  return Number((dailyRate * nights).toFixed(2));
}

function detectSource(summary, url) {
  const summaryLower = (summary || '').toLowerCase();
  const urlLower = (url || '').toLowerCase();
  
  if (urlLower.includes('airbnb') || summaryLower.includes('airbnb')) return 'airbnb';
  if (urlLower.includes('booking') || summaryLower.includes('booking')) return 'booking';
  if (urlLower.includes('vrbo') || summaryLower.includes('vrbo')) return 'vrbo';
  
  return 'other';
}

function isBlockedEvent(event) {
  const summaryLower = (event.summary || '').toLowerCase();
  const descriptionLower = (event.description || '').toLowerCase();
  const combinedText = summaryLower + ' ' + descriptionLower;
  
  const blockedKeywords = [
    'blocked', 'unavailable', 'not available', 'closed', 'maintenance',
    'indisponível', 'fechado', 'bloqueado', 'manutenção',
    'out of office', 'occupancy', 'private'
  ];
  
  return blockedKeywords.some(keyword => combinedText.includes(keyword));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { company_id, accommodation_id } = body;

    if (!company_id) {
      return Response.json({ error: 'company_id é obrigatório' }, { status: 400 });
    }

    let accommodations;
    if (accommodation_id) {
      accommodations = await base44.entities.Accommodation.filter({ 
        id: accommodation_id,
        company_id 
      });
    } else {
      accommodations = await base44.entities.Accommodation.filter({ company_id });
    }

    const results = [];

    for (const accommodation of accommodations) {
      if (!accommodation.ical_urls || accommodation.ical_urls.length === 0) {
        continue;
      }

      let syncedCount = 0;
      let errorCount = 0;

      for (const icalConfig of accommodation.ical_urls) {
        if (!icalConfig.url) continue;

        try {
          let icalData = null;
          
          try {
            const response = await fetch(icalConfig.url);
            if (response.ok) {
              icalData = await response.text();
            }
          } catch (e) {
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(proxyUrl + encodeURIComponent(icalConfig.url));
            
            if (!response.ok) {
              throw new Error(`Erro ao buscar ${icalConfig.name}`);
            }
            
            icalData = await response.text();
          }

          const events = parseICalContent(icalData);
          
          for (const event of events) {
            try {
              if (isBlockedEvent(event)) {
              // É um período bloqueado, não uma reserva real
              const endDate = new Date(event.dtend);
              endDate.setDate(endDate.getDate() - 1);
              const adjustedEndDate = endDate.toISOString().split('T')[0];

              const reason = `${icalConfig.name}: ${event.summary || 'Bloqueado'}`;

              const existingBlockedDates = await base44.entities.BlockedDate.filter({
                accommodation_id: accommodation.id,
                start_date: event.dtstart,
                end_date: adjustedEndDate,
                source: 'ical_import'
              });

              if (existingBlockedDates.length === 0) {
                await base44.entities.BlockedDate.create({
                  company_id,
                  accommodation_id: accommodation.id,
                  start_date: event.dtstart,
                  end_date: adjustedEndDate,
                  reason: reason,
                  source: 'ical_import'
                });
              }

                // Remover reserva se existir para este período
                const existingReservations = await base44.entities.Reservation.filter({
                  external_id: event.uid,
                  accommodation_id: accommodation.id
                });
                if (existingReservations.length > 0) {
                  await base44.entities.Reservation.delete(existingReservations[0].id);
                }

              } else {
                // É uma reserva real
                const endDate = new Date(event.dtend);
                endDate.setDate(endDate.getDate() - 1);
                const adjustedCheckOut = endDate.toISOString().split('T')[0];
                
                const source = detectSource(event.summary, icalConfig.url);
                const totalAmount = calculateTotalAmount(accommodation, event.dtstart, adjustedCheckOut);

                const existingReservations = await base44.entities.Reservation.filter({ 
                  external_id: event.uid,
                  accommodation_id: accommodation.id
                });

                if (existingReservations.length > 0) {
                  const existing = existingReservations[0];
                  const updateData = {
                    check_in: event.dtstart,
                    check_out: adjustedCheckOut,
                    notes: `Importado via ${icalConfig.name}`,
                    total_amount: totalAmount,
                    source: source,
                    status: 'confirmed'
                  };
                  
                  // Só atualiza o nome se ainda for "Reservado" ou vazio (não foi editado manualmente)
                  const currentName = existing.guest_name || '';
                  if (currentName === 'Reservado' || currentName === '' || currentName === 'Reserva iCal') {
                    updateData.guest_name = event.summary || 'Reservado';
                  }
                  
                  await base44.entities.Reservation.update(existing.id, updateData);
                } else {
                  await base44.entities.Reservation.create({
                    company_id,
                    accommodation_id: accommodation.id,
                    external_id: event.uid,
                    source: source,
                    status: 'confirmed',
                    check_in: event.dtstart,
                    check_out: adjustedCheckOut,
                    guest_name: event.summary || 'Reservado',
                    notes: `Importado via ${icalConfig.name}`,
                    total_amount: totalAmount
                  });
                }
              }

              syncedCount++;
            } catch (err) {
              console.error('Erro ao processar evento:', err);
              errorCount++;
            }
          }
        } catch (error) {
          console.error(`Erro ao sincronizar ${icalConfig.name}:`, error);
          errorCount++;
        }
      }

      results.push({
        accommodation_id: accommodation.id,
        accommodation_name: accommodation.name,
        synced: syncedCount,
        errors: errorCount
      });
    }

    return Response.json({
      success: true,
      message: 'Sincronização concluída',
      results
    });

  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});