import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { parseISO, format, addDays } from 'date-fns';

export default function ExportCalendar() {
  const [icalContent, setIcalContent] = useState('');

  useEffect(() => {
    const generateIcal = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const accommodationId = urlParams.get('accommodation_id');
      const companyId = urlParams.get('company_id');

      if (!accommodationId || !companyId) {
        setIcalContent('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR');
        return;
      }

      try {
        const reservations = await base44.entities.Reservation.filter({
          company_id: companyId,
          accommodation_id: accommodationId
        });

        const blockedDates = await base44.entities.BlockedDate.filter({
          company_id: companyId,
          accommodation_id: accommodationId
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
          ical += 'END:VEVENT\r\n';
        });

        ical += 'END:VCALENDAR';
        setIcalContent(ical);
      } catch (error) {
        setIcalContent('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR');
      }
    };

    generateIcal();
  }, []);

  return (
    <pre style={{ margin: 0, padding: 0, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
      {icalContent}
    </pre>
  );
}