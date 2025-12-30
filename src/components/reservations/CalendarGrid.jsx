import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, isWithinInterval, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export default function CalendarGrid({ 
  reservations = [], 
  blockedDates = [],
  onDateClick,
  onDateRangeSelect,
  selectedRange = null,
  accommodationId = null,
  showLegend = true,
  minDate = null
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingRange, setSelectingRange] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return startOfMonth(currentMonth).getDay();
  }, [currentMonth]);

  const getDateStatus = (date) => {
    // Check reservations - exclude cancelled
    const reservation = reservations.find(r => {
      if (r.status === 'cancelled') return false;
      if (accommodationId && r.accommodation_id !== accommodationId) return false;
      const checkIn = parseISO(r.check_in);
      const checkOut = parseISO(r.check_out);
      // Check-out date is available for new check-in
      if (isSameDay(date, checkOut)) return false;
      return (isWithinInterval(date, { start: checkIn, end: checkOut }) || isSameDay(date, checkIn));
    });

    if (reservation) {
      // Extract source from reservation
      const source = reservation.source || 'direct';
      return { status: 'reserved', reservation, source };
    }

    // Check blocked dates
    const blocked = blockedDates.find(b => {
      if (accommodationId && b.accommodation_id !== accommodationId) return false;
      const start = parseISO(b.start_date);
      const end = parseISO(b.end_date);
      return (isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end));
    });

    if (blocked) {
      // Extract source from blocked reason (format: "Airbnb: reservation name")
      let source = 'blocked';
      if (blocked.reason) {
        if (blocked.reason.toLowerCase().includes('airbnb')) source = 'airbnb';
        else if (blocked.reason.toLowerCase().includes('booking')) source = 'booking';
        else if (blocked.reason.toLowerCase().includes('vrbo')) source = 'vrbo';
      }
      return { status: 'blocked', blocked, source };
    }

    return { status: 'available' };
  };

  const isInSelectedRange = (date) => {
    if (!rangeStart || !hoverDate) return false;
    const start = rangeStart < hoverDate ? rangeStart : hoverDate;
    const end = rangeStart < hoverDate ? hoverDate : rangeStart;
    return isWithinInterval(date, { start, end }) || isSameDay(date, start) || isSameDay(date, end);
  };

  const handleDateClick = (date) => {
    if (minDate && isBefore(date, startOfDay(minDate))) return;
    
    const { status } = getDateStatus(date);
    // Block clicks on reserved or blocked dates
    if (status !== 'available') return;
    
    if (onDateRangeSelect) {
      if (!selectingRange || !rangeStart) {
        setRangeStart(date);
        setSelectingRange(true);
      } else {
        const start = rangeStart < date ? rangeStart : date;
        const end = rangeStart < date ? date : rangeStart;
        onDateRangeSelect({ start, end });
        setRangeStart(null);
        setSelectingRange(false);
      }
    } else if (onDateClick) {
      onDateClick(date);
    }
  };

  const statusColors = {
    available: 'bg-white hover:bg-emerald-50 text-slate-700',
    reserved: 'bg-blue-100 text-blue-800',
    blocked: 'bg-slate-200 text-slate-500'
  };

  const sourceLabels = {
    direct: 'Reserva Direta',
    airbnb: 'Airbnb',
    booking: 'Booking',
    vrbo: 'VRBO',
    other: 'Outra plataforma',
    blocked: 'Bloqueado'
  };

  const sourceColors = {
    direct: 'bg-emerald-500',
    airbnb: 'bg-pink-500',
    booking: 'bg-blue-600',
    vrbo: 'bg-red-500',
    other: 'bg-purple-500',
    blocked: 'bg-slate-500'
  };

  return (
    <TooltipProvider>
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold text-slate-800 capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const { status, reservation, blocked, source } = getDateStatus(day);
          const isPast = minDate && isBefore(day, startOfDay(minDate));
          const isSelected = isInSelectedRange(day);
          const isUnavailable = status !== 'available';
          
          const dayButton = (
            <button
              key={day.toISOString()}
              disabled={isPast || isUnavailable}
              onClick={() => handleDateClick(day)}
              onMouseEnter={() => selectingRange && setHoverDate(day)}
              className={cn(
                "aspect-square rounded-lg text-xs sm:text-sm font-medium transition-all relative",
                statusColors[status],
                isToday(day) && "ring-2 ring-[#2C5F5D] ring-offset-1",
                isPast && "opacity-40 cursor-not-allowed",
                isUnavailable && "cursor-not-allowed",
                isSelected && "bg-[#2C5F5D]/10 ring-2 ring-[#2C5F5D]",
                isSameDay(day, rangeStart) && "bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] text-white shadow-md"
              )}
            >
              {format(day, 'd')}
              {(reservation || blocked) && source && (
                <span className={cn(
                  "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full",
                  sourceColors[source] || 'bg-slate-500'
                )} />
              )}
            </button>
          );

          // Wrap with tooltip if unavailable
          if (isUnavailable && (reservation || blocked)) {
            const tooltipText = reservation 
              ? `${sourceLabels[source] || source} - ${reservation.guest_name || 'Reserva'}`
              : `${sourceLabels[source] || 'Bloqueado'} - ${blocked.reason || ''}`;
            
            return (
              <Tooltip key={day.toISOString()}>
                <TooltipTrigger asChild>
                  {dayButton}
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return dayButton;
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-white border border-slate-200" />
              <span className="text-xs text-slate-600">Disponível</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-100" />
              <span className="text-xs text-slate-600">Reservado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-200" />
              <span className="text-xs text-slate-600">Bloqueado</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-xs font-medium text-slate-500">Origem:</span>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-600">Direta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-pink-500" />
              <span className="text-xs text-slate-600">Airbnb</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-600" />
              <span className="text-xs text-slate-600">Booking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-xs text-slate-600">VRBO</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}