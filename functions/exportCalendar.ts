import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, format, addDays } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    // Parse body for function calls, or query params for direct HTTP calls
    let accommodation_id, company_id;
    
    if (req.method === 'POST') {
      const body = await req.json();
      accommodation_id = body.accommodation_id;
      company_id = body.company_id;
    } else {
      const url = new URL(req.url);
      accommodation_id = url.searchParams.get('accommodation_id');
      company_id = url.searchParams.get('company_id');
    }

    if (!accommodation_id || !company_id) {
      return new Response('Parâmetros inválidos', { status: 400 });
    }

    // Usar service role diretamente, sem autenticação (endpoint público para iCal)
    const base44 = createClientFromRequest(req);

    const reservations = await base44.asServiceRole.entities.Reservation.filter({
      company_id,
      accommodation_id
    });

    const blockedDates = await base44.asServiceRole.entities.BlockedDate.filter({
      company_id,
      accommodation_id
    });

    let ical = 'BEGIN:VCALENDAR\r\n';
    ical += 'VERSION:2.0\r\n';
    ical += 'PRODID:-//Homeaway.com//NONSGML Homeaway//EN\r\n';
    ical += 'X-WR-CALNAME:Conecta Hospede\r\n';

    reservations
      .filter(r => r.status !== 'cancelled')
      .forEach(reservation => {
        const checkIn = parseISO(reservation.check_in);
        const checkOut = parseISO(reservation.check_out);
        const uid = `res-${reservation.id}@conectahospede.app`;
        const dtstart = format(checkIn, 'yyyyMMdd');
        const dtend = format(checkOut, 'yyyyMMdd');
        const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

        ical += 'BEGIN:VEVENT\r\n';
        ical += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
        ical += `DTEND;VALUE=DATE:${dtend}\r\n`;
        ical += `DTSTAMP:${now}\r\n`;
        ical += `UID:${uid}\r\n`;
        ical += `SUMMARY:Reservado\r\n`;
        ical += `DESCRIPTION:Reservado\r\n`;
        ical += 'END:VEVENT\r\n';
      });

    blockedDates.forEach(block => {
      const start = parseISO(block.start_date);
      const end = parseISO(block.end_date);
      const uid = `blk-${block.id}@conectahospede.app`;
      const dtstart = format(start, 'yyyyMMdd');
      const dtend = format(addDays(end, 1), 'yyyyMMdd');
      const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

      ical += 'BEGIN:VEVENT\r\n';
      ical += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
      ical += `DTEND;VALUE=DATE:${dtend}\r\n`;
      ical += `DTSTAMP:${now}\r\n`;
      ical += `UID:${uid}\r\n`;
      ical += `SUMMARY:Bloqueado\r\n`;
      ical += `DESCRIPTION:Bloqueado\r\n`;
      ical += 'END:VEVENT\r\n';
    });

    ical += 'END:VCALENDAR\r\n';

    return new Response(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="calendar.ics"'
      }
    });
  } catch (error) {
    console.error('Erro ao gerar calendário:', error);
    return new Response('Erro ao gerar calendário', { status: 500 });
  }
});