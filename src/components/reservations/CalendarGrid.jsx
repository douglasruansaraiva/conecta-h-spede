import React, { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, isWithinInterval, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    const dateStr = format(date, 'yyyy-MM-dd');
    
    // Check reservations
    const reservation = reservations.find(r => {
      if (accommodationId && r.accommodation_id !== accommodationId) return false;
      const checkIn = parseISO(r.check_in);
      const checkOut = parseISO(r.check_out);
      return isWithinInterval(date, { start: checkIn, end: checkOut }) || 
             isSameDay(date, checkIn) || 
             isSameDay(date, checkOut);
    });

    if (reservation) {
      return { status: 'reserved', reservation };
    }

    // Check blocked dates
    const blocked = blockedDates.find(b => {
      if (accommodationId && b.accommodation_id !== accommodationId) return false;
      const start = parseISO(b.start_date);
      const end = parseISO(b.end_date);
      return isWithinInterval(date, { start, end }) || 
             isSameDay(date, start) || 
             isSameDay(date, end);
    });

    if (blocked) {
      return { status: 'blocked', blocked };
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
    reserved: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    blocked: 'bg-slate-200 text-slate-500'
  };

  return (
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
          <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
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
          const { status, reservation } = getDateStatus(day);
          const isPast = minDate && isBefore(day, startOfDay(minDate));
          const isSelected = isInSelectedRange(day);
          
          return (
            <button
              key={day.toISOString()}
              disabled={isPast || (status !== 'available' && onDateRangeSelect)}
              onClick={() => handleDateClick(day)}
              onMouseEnter={() => selectingRange && setHoverDate(day)}
              className={cn(
                "aspect-square rounded-lg text-sm font-medium transition-all relative",
                statusColors[status],
                isToday(day) && "ring-2 ring-emerald-500 ring-offset-1",
                isPast && "opacity-40 cursor-not-allowed",
                isSelected && "bg-emerald-100 ring-2 ring-emerald-500",
                isSameDay(day, rangeStart) && "bg-emerald-500 text-white"
              )}
            >
              {format(day, 'd')}
              {reservation && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100">
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
      )}
    </div>
  );
}