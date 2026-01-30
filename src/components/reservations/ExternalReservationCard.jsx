import React from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, Phone, Mail, Home, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExternalReservationCard({ 
  blockedDate, 
  accommodation,
  onClick,
  compact = false 
}) {
  const checkIn = parseISO(blockedDate.start_date);
  const checkOut = parseISO(blockedDate.end_date);
  const nights = differenceInDays(checkOut, checkIn);
  
  const getSourceLabel = () => {
    const reasonLower = (blockedDate.reason || '').toLowerCase();
    if (reasonLower.includes('airbnb')) return 'Airbnb';
    if (reasonLower.includes('booking')) return 'Booking';
    if (reasonLower.includes('vrbo')) return 'VRBO';
    return 'Externa';
  };

  const getSourceColor = () => {
    const reasonLower = (blockedDate.reason || '').toLowerCase();
    if (reasonLower.includes('airbnb')) return 'bg-rose-100 text-rose-800';
    if (reasonLower.includes('booking')) return 'bg-blue-100 text-blue-800';
    if (reasonLower.includes('vrbo')) return 'bg-purple-100 text-purple-800';
    return 'bg-slate-100 text-slate-800';
  };

  const guestName = blockedDate.guest_name || 
    (blockedDate.reason?.includes(':') ? blockedDate.reason.split(':')[1].trim() : 'Hóspede');

  if (compact) {
    return (
      <div 
        className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800">{guestName}</p>
            <p className="text-xs text-slate-500">
              {format(checkIn, 'dd/MM')} - {format(checkOut, 'dd/MM')} • {nights} noites
            </p>
          </div>
        </div>
        <Badge className={getSourceColor()}>{getSourceLabel()}</Badge>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <User className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">{guestName}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={getSourceColor()} variant="secondary">{getSourceLabel()}</Badge>
                </div>
              </div>
            </div>
            
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {accommodation && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Home className="w-4 h-4 text-slate-400" />
              <span>{accommodation.name}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>
              {format(checkIn, "dd 'de' MMM", { locale: ptBR })} → {format(checkOut, "dd 'de' MMM", { locale: ptBR })}
              <span className="text-slate-400 ml-1">({nights} noites)</span>
            </span>
          </div>

          {blockedDate.guest_phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{blockedDate.guest_phone}</span>
            </div>
          )}

          {blockedDate.guest_email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{blockedDate.guest_email}</span>
            </div>
          )}

          {blockedDate.notes && (
            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500">{blockedDate.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}