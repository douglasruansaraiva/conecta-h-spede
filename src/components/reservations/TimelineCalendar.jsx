import React, { useState, useMemo } from 'react';
import { format, addDays, startOfWeek, subDays, parseISO, isSameDay, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import ReservationNotesDialog from './ReservationNotesDialog';
import BlockedDateNotesDialog from './BlockedDateNotesDialog';

export default function TimelineCalendar({ 
  reservations = [], 
  blockedDates = [],
  accommodations = []
}) {
  const [startDate, setStartDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [blockedNotesDialogOpen, setBlockedNotesDialogOpen] = useState(false);
  const [selectedBlockedDate, setSelectedBlockedDate] = useState(null);
  
  // Generate 14 days (2 weeks)
  const dates = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  const goToPrevious = () => {
    setStartDate(subDays(startDate, 7));
  };

  const goToNext = () => {
    setStartDate(addDays(startDate, 7));
  };

  const getReservationForDate = (accommodationId, date) => {
    return reservations.find(r => {
      if (r.status === 'cancelled') return false;
      if (r.accommodation_id !== accommodationId) return false;
      const checkIn = parseISO(r.check_in);
      const checkOut = parseISO(r.check_out);
      if (isSameDay(date, checkOut)) return false;
      return (isWithinInterval(date, { start: checkIn, end: checkOut }) || isSameDay(date, checkIn));
    });
  };

  const getBlockedDateForDate = (accommodationId, date) => {
    return blockedDates.find(b => {
      if (b.accommodation_id !== accommodationId) return false;
      const blockStart = parseISO(b.start_date);
      const blockEnd = parseISO(b.end_date);
      return date >= blockStart && date <= blockEnd;
    });
  };

  const handleCellClick = (accommodation, date) => {
    const reservation = getReservationForDate(accommodation.id, date);
    const blocked = getBlockedDateForDate(accommodation.id, date);
    
    if (reservation) {
      setSelectedReservation(reservation);
      setNotesDialogOpen(true);
    } else if (blocked) {
      setSelectedBlockedDate(blocked);
      setBlockedNotesDialogOpen(true);
    }
  };

  const sourceColors = {
    direct: 'bg-emerald-100 border-emerald-300 text-emerald-800',
    airbnb: 'bg-pink-100 border-pink-300 text-pink-800',
    booking: 'bg-blue-100 border-blue-300 text-blue-800',
    vrbo: 'bg-red-100 border-red-300 text-red-800',
    other: 'bg-purple-100 border-purple-300 text-purple-800',
    blocked: 'bg-slate-100 border-slate-300 text-slate-600'
  };

  const getSource = (reservation, blocked) => {
    if (reservation) return reservation.source || 'direct';
    if (blocked) {
      const reasonLower = (blocked.reason || '').toLowerCase();
      if (reasonLower.includes('airbnb')) return 'airbnb';
      if (reasonLower.includes('booking')) return 'booking';
      if (reasonLower.includes('vrbo')) return 'vrbo';
      return 'blocked';
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrevious}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-base font-semibold text-slate-800">
          {format(startDate, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Timeline Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Date Headers */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <div className="w-40 flex-shrink-0 p-3 text-xs font-semibold text-slate-600 border-r border-slate-200">
              Acomodação
            </div>
            {dates.map((date) => (
              <div
                key={date.toISOString()}
                className="w-20 flex-shrink-0 p-2 text-center border-r border-slate-200"
              >
                <div className="text-[10px] font-medium text-slate-500 uppercase">
                  {format(date, 'EEE', { locale: ptBR })}
                </div>
                <div className="text-sm font-semibold text-slate-700">
                  {format(date, 'dd')}
                </div>
                <div className="text-[10px] text-slate-400">
                  {format(date, 'MMM', { locale: ptBR })}
                </div>
              </div>
            ))}
          </div>

          {/* Accommodation Rows */}
          {accommodations.map((accommodation) => (
            <div key={accommodation.id} className="flex border-b border-slate-200 hover:bg-slate-50/50">
              <div className="w-40 flex-shrink-0 p-3 border-r border-slate-200 flex items-center">
                <div className="text-xs font-medium text-slate-700 truncate">
                  {accommodation.name}
                </div>
              </div>
              {dates.map((date) => {
                const reservation = getReservationForDate(accommodation.id, date);
                const blocked = getBlockedDateForDate(accommodation.id, date);
                const source = getSource(reservation, blocked);
                const isOccupied = reservation || blocked;

                return (
                  <div
                    key={date.toISOString()}
                    onClick={() => handleCellClick(accommodation, date)}
                    className={cn(
                      "w-20 flex-shrink-0 p-1 border-r border-slate-200 cursor-pointer transition-colors",
                      isOccupied && "hover:opacity-80"
                    )}
                  >
                    {isOccupied && (
                      <div className={cn(
                        "h-full rounded border-2 p-1 flex flex-col justify-center items-center min-h-[60px]",
                        sourceColors[source] || sourceColors.blocked
                      )}>
                        <div className="text-[9px] font-semibold truncate w-full text-center">
                          {reservation?.guest_name || blocked?.reason?.split(':')[0] || 'Bloqueado'}
                        </div>
                        {reservation?.status && (
                          <div className="text-[8px] mt-0.5 opacity-70">
                            {reservation.status === 'confirmed' ? 'Confirmado' : 
                             reservation.status === 'pending' ? 'Pendente' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
            <span className="text-slate-600">Direta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-pink-100 border border-pink-300" />
            <span className="text-slate-600">Airbnb</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
            <span className="text-slate-600">Booking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-slate-100 border border-slate-300" />
            <span className="text-slate-600">Bloqueado</span>
          </div>
        </div>
      </div>

      <ReservationNotesDialog
        reservation={selectedReservation}
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
      />
      
      <BlockedDateNotesDialog
        blockedDate={selectedBlockedDate}
        open={blockedNotesDialogOpen}
        onOpenChange={setBlockedNotesDialogOpen}
      />
    </div>
  );
}