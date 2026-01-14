import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Parse query params
    const url = new URL(req.url);
    const accommodation_id = url.searchParams.get('accommodation_id');
    const token = url.searchParams.get('token');

    if (!accommodation_id || !token) {
      return new Response('Missing parameters: accommodation_id and token are required', { 
        status: 400,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Criar client sem autenticação (endpoint público)
    const base44 = createClientFromRequest(req);

    // Validar token contra accommodation usando service role
    const accommodations = await base44.asServiceRole.entities.Accommodation.filter({
      id: accommodation_id
    });
    
    if (accommodations.length === 0) {
      return new Response('Accommodation not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const accommodation = accommodations[0];

    if (accommodation.ical_export_token !== token) {
      return new Response('Invalid token', { 
        status: 403,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    const company_id = accommodation.company_id;

    // Buscar reservas ativas (não canceladas)
    const allReservations = await base44.asServiceRole.entities.Reservation.filter({
      accommodation_id: accommodation_id,
      company_id: company_id
    });
    
    const reservations = allReservations.filter(r => r.status !== 'cancelled');

    // Buscar datas bloqueadas
    const blockedDates = await base44.asServiceRole.entities.BlockedDate.filter({
      accommodation_id: accommodation_id,
      company_id: company_id
    });

    // Gerar arquivo iCal
    let ical = 'BEGIN:VCALENDAR\r\n';
    ical += 'VERSION:2.0\r\n';
    ical += 'PRODID:-//Conecta Hospede//NONSGML v1.0//EN\r\n';
    ical += 'CALSCALE:GREGORIAN\r\n';
    ical += 'METHOD:PUBLISH\r\n';
    ical += `X-WR-CALNAME:${accommodation.name || 'Calendario'}\r\n`;
    ical += 'X-WR-TIMEZONE:America/Sao_Paulo\r\n';

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Adicionar reservas como eventos
    reservations.forEach(res => {
      const checkIn = res.check_in.replace(/-/g, '');
      const checkOut = res.check_out.replace(/-/g, '');
      
      ical += 'BEGIN:VEVENT\r\n';
      ical += `UID:res-${res.id}@conectahospede.app\r\n`;
      ical += `DTSTAMP:${now}\r\n`;
      ical += `DTSTART;VALUE=DATE:${checkIn}\r\n`;
      ical += `DTEND;VALUE=DATE:${checkOut}\r\n`;
      ical += `SUMMARY:Reservado${res.guest_name ? ' - ' + res.guest_name : ''}\r\n`;
      
      if (res.notes) {
        ical += `DESCRIPTION:${res.notes.replace(/\n/g, '\\n')}\r\n`;
      }
      
      ical += 'STATUS:CONFIRMED\r\n';
      ical += 'TRANSP:OPAQUE\r\n';
      ical += 'END:VEVENT\r\n';
    });

    // Adicionar datas bloqueadas
    blockedDates.forEach(block => {
      const start = block.start_date.replace(/-/g, '');
      const end = block.end_date.replace(/-/g, '');
      
      ical += 'BEGIN:VEVENT\r\n';
      ical += `UID:block-${block.id}@conectahospede.app\r\n`;
      ical += `DTSTAMP:${now}\r\n`;
      ical += `DTSTART;VALUE=DATE:${start}\r\n`;
      ical += `DTEND;VALUE=DATE:${end}\r\n`;
      ical += `SUMMARY:Bloqueado${block.reason ? ' - ' + block.reason : ''}\r\n`;
      
      if (block.source === 'ical_import') {
        ical += 'DESCRIPTION:Importado de calendário externo\r\n';
      }
      
      ical += 'STATUS:CONFIRMED\r\n';
      ical += 'TRANSP:OPAQUE\r\n';
      ical += 'END:VEVENT\r\n';
    });

    ical += 'END:VCALENDAR\r\n';

    return new Response(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="calendar.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Export calendar error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
});