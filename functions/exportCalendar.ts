import { base44 } from '@base44/sdk';
import { parseISO, format, addDays } from 'date-fns';

export default async function exportCalendar(request) {
  const { accommodation_id, company_id } = request.query;

  if (!accommodation_id || !company_id) {
    return {
      status: 400,
      body: 'Parâmetros inválidos'
    };
  }

  try {
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
    ical += 'PRODID:-//Conecta Hospede//NONSGML v1.0//EN\r\n';
    ical += 'CALSCALE:GREGORIAN\r\n';
    ical += 'METHOD:PUBLISH\r\n';

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
        ical += `UID:${uid}\r\n`;
        ical += `DTSTAMP:${now}\r\n`;
        ical += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
        ical += `DTEND;VALUE=DATE:${dtend}\r\n`;
        ical += `SUMMARY:Reservado\r\n`;
        ical += 'STATUS:CONFIRMED\r\n';
        ical += 'TRANSP:OPAQUE\r\n';
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
      ical += `UID:${uid}\r\n`;
      ical += `DTSTAMP:${now}\r\n`;
      ical += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
      ical += `DTEND;VALUE=DATE:${dtend}\r\n`;
      ical += `SUMMARY:Bloqueado\r\n`;
      ical += 'STATUS:CONFIRMED\r\n';
      ical += 'TRANSP:OPAQUE\r\n';
      ical += 'END:VEVENT\r\n';
    });

    ical += 'END:VCALENDAR';

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="calendar.ics"',
        'Cache-Control': 'no-cache'
      },
      body: ical
    };
  } catch (error) {
    return {
      status: 500,
      body: 'Erro ao gerar calendário'
    };
  }
}