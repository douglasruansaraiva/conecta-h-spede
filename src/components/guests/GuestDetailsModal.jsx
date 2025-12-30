import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  Mail, 
  Phone, 
  FileText,
  Home,
  Star,
  UtensilsCrossed,
  Loader2
} from "lucide-react";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export default function GuestDetailsModal({ guest, open, onClose, companyId }) {
  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ['guest-reservations', guest?.id],
    queryFn: async () => {
      if (!guest?.id) return [];
      return await base44.entities.Reservation.filter({ guest_id: guest.id });
    },
    enabled: !!guest?.id && open
  });

  const { data: accommodations = [] } = useQuery({
    queryKey: ['accommodations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return await base44.entities.Accommodation.filter({ company_id: companyId });
    },
    enabled: !!companyId && open
  });

  const getAccommodationName = (accId) => {
    const acc = accommodations.find(a => a.id === accId);
    return acc?.name || 'N/A';
  };

  const statusConfig = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'Confirmada', color: 'bg-blue-100 text-blue-800' },
    checked_in: { label: 'Check-in', color: 'bg-green-100 text-green-800' },
    checked_out: { label: 'Check-out', color: 'bg-slate-100 text-slate-600' },
    cancelled: { label: 'Cancelada', color: 'bg-red-100 text-red-800' }
  };

  if (!guest) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center">
              <span className="text-lg font-bold text-white">
                {guest.name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
            {guest.name}
            {guest.vip && (
              <Badge className="bg-amber-100 text-amber-800">
                <Star className="w-3 h-3 mr-1" />
                VIP
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Pessoais */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-slate-800 mb-3">Informações Pessoais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {guest.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{guest.email}</span>
                  </div>
                )}
                {guest.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span>{guest.phone}</span>
                  </div>
                )}
                {(guest.city || guest.state) && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{[guest.city, guest.state].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {guest.document && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <span>{guest.document}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preferências */}
          {(guest.preferred_room_type || guest.dietary_restrictions || guest.special_requests) && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-slate-800 mb-3">Preferências</h3>
                {guest.preferred_room_type && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Home className="w-4 h-4 text-slate-400" />
                    <span>Tipo preferido: {guest.preferred_room_type}</span>
                  </div>
                )}
                {guest.dietary_restrictions && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <UtensilsCrossed className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Restrições alimentares:</p>
                      <p className="text-slate-500">{guest.dietary_restrictions}</p>
                    </div>
                  </div>
                )}
                {guest.special_requests && (
                  <div className="flex items-start gap-2 text-sm text-slate-600">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Pedidos especiais:</p>
                      <p className="text-slate-500">{guest.special_requests}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Estatísticas */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                <p className="text-2xl font-bold text-slate-800">{guest.total_stays || 0}</p>
                <p className="text-sm text-slate-500">Estadias</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                <p className="text-2xl font-bold text-slate-800">
                  R$ {(guest.total_spent || 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-sm text-slate-500">Total Gasto</p>
              </CardContent>
            </Card>
          </div>

          {/* Histórico de Reservas */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold text-slate-800 mb-4">Histórico de Reservas</h3>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : reservations.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhuma reserva encontrada</p>
              ) : (
                <div className="space-y-3">
                  {reservations
                    .sort((a, b) => new Date(b.check_in) - new Date(a.check_in))
                    .map(reservation => (
                      <div 
                        key={reservation.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-slate-800">
                              {getAccommodationName(reservation.accommodation_id)}
                            </h4>
                            <Badge className={statusConfig[reservation.status]?.color}>
                              {statusConfig[reservation.status]?.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-500">
                            {format(parseISO(reservation.check_in), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                            {' → '}
                            {format(parseISO(reservation.check_out), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-800">
                            R$ {(reservation.total_amount || 0).toFixed(2)}
                          </p>
                          {reservation.paid_amount > 0 && (
                            <p className="text-xs text-emerald-600">
                              Pago: R$ {reservation.paid_amount.toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {guest.notes && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold text-slate-800 mb-2">Observações</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line">{guest.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}