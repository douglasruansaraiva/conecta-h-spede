import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { parseISO, format } from 'date-fns';

export default function ExportCalendar() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateIcal = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const accommodationId = urlParams.get('accommodation_id');
      const companyId = urlParams.get('company_id');

      if (!accommodationId || !companyId) {
        document.body.innerText = 'Parâmetros inválidos';
        return;
      }

      try {
        // Fetch reservations
        const reservations = await base44.entities.Reservation.filter({
          company_id: companyId,
          accommodation_id: accommodationId
        });

        // Fetch blocked dates
        const blockedDates = await base44.entities.BlockedDate.filter({
          company_id: companyId,
          accommodation_id: accommodationId
        });

        // Generate iCal
        let ical = 'BEGIN:VCALENDAR\r\n';
        ical += 'VERSION:2.0\r\n';
        ical += 'PRODID:-//Conecta Hóspede//Calendário//PT\r\n';
        ical += 'CALSCALE:GREGORIAN\r\n';
        ical += 'METHOD:PUBLISH\r\n';
        ical += 'X-WR-CALNAME:Reservas\r\n';
        ical += 'X-WR-TIMEZONE:America/Sao_Paulo\r\n';

        // Add reservations (exclude cancelled)
        reservations
          .filter(r => r.status !== 'cancelled')
          .forEach(reservation => {
            const checkIn = parseISO(reservation.check_in);
            const checkOut = parseISO(reservation.check_out);
            const uid = `reservation-${reservation.id}@conectahospede.com`;
            const dtstart = format(checkIn, 'yyyyMMdd');
            const dtend = format(checkOut, 'yyyyMMdd');
            const summary = reservation.guest_name || 'Reserva';
            const description = `Status: ${reservation.status}\\nOrigem: ${reservation.source || 'direct'}`;

            ical += 'BEGIN:VEVENT\r\n';
            ical += `UID:${uid}\r\n`;
            ical += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
            ical += `DTEND;VALUE=DATE:${dtend}\r\n`;
            ical += `SUMMARY:${summary}\r\n`;
            ical += `DESCRIPTION:${description}\r\n`;
            ical += 'STATUS:CONFIRMED\r\n';
            ical += 'TRANSP:OPAQUE\r\n';
            ical += 'END:VEVENT\r\n';
          });

        // Add blocked dates
        blockedDates.forEach(block => {
          const start = parseISO(block.start_date);
          const end = parseISO(block.end_date);
          const uid = `block-${block.id}@conectahospede.com`;
          const dtstart = format(start, 'yyyyMMdd');
          const dtend = format(end, 'yyyyMMdd');
          const summary = block.reason || 'Bloqueado';

          ical += 'BEGIN:VEVENT\r\n';
          ical += `UID:${uid}\r\n`;
          ical += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
          ical += `DTEND;VALUE=DATE:${dtend}\r\n`;
          ical += `SUMMARY:${summary}\r\n`;
          ical += 'STATUS:CONFIRMED\r\n';
          ical += 'TRANSP:OPAQUE\r\n';
          ical += 'END:VEVENT\r\n';
        });

        ical += 'END:VCALENDAR\r\n';

        // Return as downloadable file
        const blob = new Blob([ical], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `calendario-${accommodationId}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Show success message
        document.body.innerHTML = '<div style="font-family: sans-serif; padding: 40px; text-align: center;"><h2>Calendário exportado com sucesso!</h2><p>O arquivo foi baixado automaticamente.</p></div>';
      } catch (error) {
        document.body.innerText = 'Erro ao gerar calendário: ' + error.message;
      }
    };

    generateIcal();
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '40px', textAlign: 'center' }}>
      <h2>Gerando calendário...</h2>
    </div>
  );
}