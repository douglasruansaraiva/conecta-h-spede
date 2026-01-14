import { createClient } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    // Parse query params (endpoint público)
    const url = new URL(req.url);
    const accommodation_id = url.searchParams.get('accommodation_id');
    const token = url.searchParams.get('token');

    if (!accommodation_id || !token) {
      return new Response('Missing parameters', { status: 400 });
    }

    // Service role client (público, sem JWT)
    const base44 = createClient(
      Deno.env.get('BASE44_APP_ID'),
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // Validar token contra accommodation
    const accommodations = await base44.entities.Accommodation.list();
    const accommodation = accommodations.find(a => 
      a.id === accommodation_id && a.ical_export_token === token
    );

    if (!accommodation) {
      return new Response('Invalid token', { status: 403 });
    }

    const company_id = accommodation.company_id;

    // Buscar reservas ativas (não canceladas)
    const allReservations = await base44.entities.Reservation.list();
    const reservations = allReservations.filter(r => 
      r.accommodation_id === accommodation_id && 
      r.company_id === company_id &&
      r.status !== 'cancelled'
    );

    const allBlocked = await base44.entities.BlockedDate.list();
    const blockedDates = allBlocked.filter(b => 
      b.accommodation_id === accommodation_id && 
      b.company_id === company_id
    );

    // Gerar arquivo iCal
    let ical = 'BEGIN:VCALENDAR\r\n';
    ical += 'VERSION:2.0\r\n';
    ical += 'PRODID:-//Conecta Hospede//NONSGML v1.0//EN\r\n';
    ical += 'CALSCALE:GREGORIAN\r\n';
    ical += 'METHOD:PUBLISH\r\n';

    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Adicionar reservas como eventos de dia inteiro
    reservations.forEach(res => {
      const checkIn = res.check_in.replace(/-/g, '');
      const checkOut = res.check_out.replace(/-/g, '');
      
      ical += 'BEGIN:VEVENT\r\n';
      ical += `UID:res-${res.id}@conectahospede.app\r\n`;
      ical += `DTSTAMP:${now}\r\n`;
      ical += `DTSTART;VALUE=DATE:${checkIn}\r\n`;
      ical += `DTEND;VALUE=DATE:${checkOut}\r\n`;
      ical += `SUMMARY:Reservado - ${res.guest_name || 'Hóspede'}\r\n`;
      ical += 'STATUS:CONFIRMED\r\n';
      ical += 'TRANSP:OPAQUE\r\n';
      ical += 'END:VEVENT\r\n';
    });

    // Adicionar bloqueios
    blockedDates.forEach(block => {
      const start = block.start_date.replace(/-/g, '');
      const end = block.end_date.replace(/-/g, '');
      
      ical += 'BEGIN:VEVENT\r\n';
      ical += `UID:blk-${block.id}@conectahospede.app\r\n`;
      ical += `DTSTAMP:${now}\r\n`;
      ical += `DTSTART;VALUE=DATE:${start}\r\n`;
      ical += `DTEND;VALUE=DATE:${end}\r\n`;
      ical += `SUMMARY:Bloqueado${block.reason ? ' - ' + block.reason : ''}\r\n`;
      ical += 'STATUS:CONFIRMED\r\n';
      ical += 'TRANSP:OPAQUE\r\n';
      ical += 'END:VEVENT\r\n';
    });

    ical += 'END:VCALENDAR';

    return new Response(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="calendar.ics"',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});