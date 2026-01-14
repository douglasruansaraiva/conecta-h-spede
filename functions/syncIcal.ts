import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Buscar acomodações para sincronizar
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

      // Deletar bloqueios existentes de iCal para esta acomodação
      const existingBlocks = await base44.entities.BlockedDate.filter({ 
        company_id,
        accommodation_id: accommodation.id,
        source: 'ical_import'
      });
      
      for (const block of existingBlocks) {
        await base44.entities.BlockedDate.delete(block.id);
      }

      // Sincronizar cada URL iCal
      for (const icalConfig of accommodation.ical_urls) {
        if (!icalConfig.url) continue;

        try {
          // Buscar dados iCal
          let icalData = null;
          
          try {
            const response = await fetch(icalConfig.url);
            if (response.ok) {
              icalData = await response.text();
            }
          } catch (e) {
            // Tentar com proxy CORS
            const proxyUrl = 'https://api.allorigins.win/raw?url=';
            const response = await fetch(proxyUrl + encodeURIComponent(icalConfig.url));
            
            if (!response.ok) {
              throw new Error(`Erro ao buscar ${icalConfig.name}`);
            }
            
            icalData = await response.text();
          }

          // Parse iCal
          const events = [];
          const lines = icalData.split(/\r?\n/);
          let currentEvent = null;
          
          for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed === 'BEGIN:VEVENT') {
              currentEvent = {};
            } else if (trimmed === 'END:VEVENT' && currentEvent) {
              if (currentEvent.start && currentEvent.end) {
                events.push(currentEvent);
              }
              currentEvent = null;
            } else if (currentEvent) {
              if (trimmed.startsWith('DTSTART')) {
                const match = trimmed.match(/DTSTART[^:]*:(\d{8})/);
                if (match) {
                  const dateStr = match[1];
                  currentEvent.start = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
                }
              } 
              else if (trimmed.startsWith('DTEND')) {
                const match = trimmed.match(/DTEND[^:]*:(\d{8})/);
                if (match) {
                  const dateStr = match[1];
                  currentEvent.end = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
                }
              } 
              else if (trimmed.startsWith('SUMMARY')) {
                const parts = trimmed.split(':');
                currentEvent.summary = parts.slice(1).join(':').trim();
              }
            }
          }

          // Criar bloqueios
          for (const event of events) {
            try {
              await base44.entities.BlockedDate.create({
                company_id,
                accommodation_id: accommodation.id,
                start_date: event.start,
                end_date: event.end,
                reason: `${icalConfig.name || 'Reserva externa'}: ${event.summary || ''}`,
                source: 'ical_import'
              });
              syncedCount++;
            } catch (err) {
              console.error('Erro ao criar bloqueio:', err);
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