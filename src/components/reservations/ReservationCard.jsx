import React from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, User, Phone, Mail, Home, CreditCard, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusConfig = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800' },
  confirmed: { label: 'Confirmada', color: 'bg-emerald-100 text-emerald-800' },
  checked_in: { label: 'Hospedado', color: 'bg-blue-100 text-blue-800' },
  checked_out: { label: 'Finalizada', color: 'bg-slate-100 text-slate-800' },
  cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
};

const sourceConfig = {
  direct: { label: 'Direto', color: 'bg-emerald-50 text-emerald-700' },
  airbnb: { label: 'Airbnb', color: 'bg-rose-50 text-rose-700' },
  booking: { label: 'Booking', color: 'bg-blue-50 text-blue-700' },
  vrbo: { label: 'VRBO', color: 'bg-purple-50 text-purple-700' },
  other: { label: 'Outro', color: 'bg-slate-50 text-slate-700' }
};

export default function ReservationCard({ 
  reservation, 
  accommodation,
  onEdit,
  onStatusChange,
  onAddPayment,
  onDelete,
  compact = false 
}) {
  const checkIn = parseISO(reservation.check_in);
  const checkOut = parseISO(reservation.check_out);
  const nights = differenceInDays(checkOut, checkIn);
  const status = statusConfig[reservation.status] || statusConfig.pending;
  const source = sourceConfig[reservation.source] || sourceConfig.other;
  const pendingAmount = (reservation.total_amount || 0) - (reservation.paid_amount || 0);

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800">{reservation.guest_name || 'Hóspede'}</p>
            <p className="text-xs text-slate-500">
              {format(checkIn, 'dd/MM')} - {format(checkOut, 'dd/MM')} • {nights} noites
            </p>
          </div>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <User className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-800">{reservation.guest_name || 'Hóspede'}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={status.color} variant="secondary">{status.label}</Badge>
                  <Badge className={source.color} variant="secondary">{source.label}</Badge>
                </div>
              </div>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>Editar Reserva</DropdownMenuItem>
                {reservation.status === 'pending' && (
                  <DropdownMenuItem onClick={() => onStatusChange('confirmed')}>
                    Confirmar
                  </DropdownMenuItem>
                )}
                {reservation.status === 'confirmed' && (
                  <DropdownMenuItem onClick={() => onStatusChange('checked_in')}>
                    Check-in
                  </DropdownMenuItem>
                )}
                {reservation.status === 'checked_in' && (
                  <DropdownMenuItem onClick={() => onStatusChange('checked_out')}>
                    Check-out
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onAddPayment}>Registrar Pagamento</DropdownMenuItem>
                {reservation.status !== 'cancelled' && reservation.status !== 'checked_out' && (
                  <DropdownMenuItem 
                    onClick={() => onStatusChange('cancelled')}
                    className="text-red-600"
                  >
                    Cancelar Reserva
                  </DropdownMenuItem>
                )}
                {reservation.status === 'cancelled' && onDelete && (
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir Reserva
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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

          {reservation.guest_phone && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              <span>{reservation.guest_phone}</span>
            </div>
          )}

          {reservation.guest_email && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{reservation.guest_email}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">
                R$ {(reservation.paid_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                R$ {(reservation.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {pendingAmount > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Falta R$ {pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}