import { base44 } from '@base44/sdk';
import { parseISO, format, addDays } from 'date-fns';

export default async function exportCalendar(request) {
  // Support both /api/exportCalendar?params and /api/exportCalendar/calendar.ics?params
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

    let ical = 'BEGIN:VCALENDAR\n';
    ical += 'VERSION:2.0\n';
    ical += 'PRODID:-//Conecta Hospede//Calendar//EN\n';

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
        ical += `DTSTART:${dtstart}\n`;
        ical += `DTEND:${dtend}\n`;
        ical += `SUMMARY:Reserved\n`;
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
      ical += `DTSTART:${dtstart}\n`;
      ical += `DTEND:${dtend}\n`;
      ical += `SUMMARY:Not Available\n`;
      ical += 'END:VEVENT\n';
    });

    ical += 'END:VCALENDAR';

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="calendar.ics"'
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