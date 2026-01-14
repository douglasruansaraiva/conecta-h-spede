import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { parseISO, format, addDays } from 'npm:date-fns';

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const accommodation_id = url.searchParams.get('accommodation_id');
    const company_id = url.searchParams.get('company_id');

    if (!accommodation_id || !company_id) {
      return new Response('Parâmetros inválidos', { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const reservations = await base44.asServiceRole.entities.Reservation.filter({
      company_id,
      accommodation_id
    });

    const blockedDates = await base44.asServiceRole.entities.BlockedDate.filter({
      company_id,
      accommodation_id
    });

    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//Conecta Hospede//Calendar//EN\n';
    ical += 'CALSCALE:GREGORIAN\n';
    ical += 'METHOD:PUBLISH\n';

    reservations
      .filter(r => r.status !== 'cancelled')
      .forEach(reservation => {
        const checkIn = parseISO(reservation.check_in);
        const checkOut = parseISO(reservation.check_out);
        const uid = `res-${reservation.id}@conectahospede.app`;
        const dtstart = format(checkIn, 'yyyyMMdd');
        const dtend = format(checkOut, 'yyyyMMdd');
        const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

        ical += 'BEGIN:VEVENT\n';
        ical += `UID:${uid}\n`;
        ical += `DTSTAMP:${now}\n`;
        ical += `DTSTART;VALUE=DATE:${dtstart}\n`;
        ical += `DTEND;VALUE=DATE:${dtend}\n`;
        ical += `SUMMARY:Reservado\n`;
        ical += `DESCRIPTION:Reserva confirmada\n`;
        ical += 'STATUS:CONFIRMED\n';
        ical += 'TRANSP:OPAQUE\n';
        ical += 'END:VEVENT\n';
      });

    blockedDates.forEach(block => {
      const start = parseISO(block.start_date);
      const end = parseISO(block.end_date);
      const uid = `blk-${block.id}@conectahospede.app`;
      const dtstart = format(start, 'yyyyMMdd');
      const dtend = format(addDays(end, 1), 'yyyyMMdd');
      const now = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");

      ical += 'BEGIN:VEVENT\n';
      ical += `UID:${uid}\n`;
      ical += `DTSTAMP:${now}\n`;
      ical += `DTSTART;VALUE=DATE:${dtstart}\n`;
      ical += `DTEND;VALUE=DATE:${dtend}\n`;
      ical += `SUMMARY:Bloqueado\n`;
      ical += `DESCRIPTION:${block.reason || 'Data bloqueada'}\n`;
      ical += 'STATUS:CONFIRMED\n';
      ical += 'TRANSP:OPAQUE\n';
      ical += 'END:VEVENT\n';
    });

    ical += 'END:VCALENDAR';

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