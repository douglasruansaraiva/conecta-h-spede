import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Calculator } from "lucide-react";
import { format, differenceInDays, parseISO, isWeekend, eachDayOfInterval } from 'date-fns';
import { base44 } from "@/api/base44Client";

export default function ReservationForm({ 
  open, 
  onClose, 
  reservation, 
  companyId, 
  accommodations = [],
  preselectedAccommodation = null,
  preselectedDates = null,
  onSave 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accommodation_id: '',
    check_in: '',
    check_out: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guests_count: 1,
    total_amount: '',
    source: 'direct',
    status: 'pending',
    notes: ''
  });

  useEffect(() => {
    if (reservation) {
      setFormData({
        accommodation_id: reservation.accommodation_id || '',
        check_in: reservation.check_in || '',
        check_out: reservation.check_out || '',
        guest_name: reservation.guest_name || '',
        guest_email: reservation.guest_email || '',
        guest_phone: reservation.guest_phone || '',
        guests_count: reservation.guests_count || 1,
        total_amount: reservation.total_amount || '',
        source: reservation.source || 'direct',
        status: reservation.status || 'pending',
        notes: reservation.notes || ''
      });
    } else {
      setFormData({
        accommodation_id: preselectedAccommodation || '',
        check_in: preselectedDates?.start ? format(preselectedDates.start, 'yyyy-MM-dd') : '',
        check_out: preselectedDates?.end ? format(preselectedDates.end, 'yyyy-MM-dd') : '',
        guest_name: '',
        guest_email: '',
        guest_phone: '',
        guests_count: 1,
        total_amount: '',
        source: 'direct',
        status: 'pending',
        notes: ''
      });
    }
  }, [reservation, preselectedAccommodation, preselectedDates, open]);

  const calculateTotal = () => {
    if (!formData.check_in || !formData.check_out || !formData.accommodation_id) return;
    
    const accommodation = accommodations.find(a => a.id === formData.accommodation_id);
    if (!accommodation) return;

    const checkIn = parseISO(formData.check_in);
    const checkOut = parseISO(formData.check_out);
    const days = eachDayOfInterval({ start: checkIn, end: checkOut }).slice(0, -1);
    
    let total = 0;
    days.forEach(day => {
      if (isWeekend(day) && accommodation.weekend_price) {
        total += accommodation.weekend_price;
      } else {
        total += accommodation.base_price || 0;
      }
    });

    setFormData(prev => ({ ...prev, total_amount: total }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...formData,
      company_id: companyId,
      guests_count: parseInt(formData.guests_count) || 1,
      total_amount: parseFloat(formData.total_amount) || 0
    };

    if (reservation) {
      await base44.entities.Reservation.update(reservation.id, data);
    } else {
      await base44.entities.Reservation.create(data);
    }

    setLoading(false);
    onSave();
    onClose();
  };

  const nights = formData.check_in && formData.check_out 
    ? differenceInDays(parseISO(formData.check_out), parseISO(formData.check_in))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{reservation ? 'Editar Reserva' : 'Nova Reserva'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Acomodação *</Label>
            <Select 
              value={formData.accommodation_id} 
              onValueChange={(v) => setFormData({ ...formData, accommodation_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {accommodations.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} - R$ {acc.base_price?.toFixed(2)}/noite
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check-in *</Label>
              <Input
                type="date"
                value={formData.check_in}
                onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Check-out *</Label>
              <Input
                type="date"
                value={formData.check_out}
                onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
                min={formData.check_in}
                required
              />
            </div>
          </div>

          {nights > 0 && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              {nights} {nights === 1 ? 'noite' : 'noites'} de hospedagem
            </div>
          )}

          <div className="border-t pt-4">
            <h4 className="font-medium text-slate-800 mb-3">Dados do Hóspede</h4>
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div>
                <Label>Nº de Hóspedes</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.guests_count}
                  onChange={(e) => setFormData({ ...formData, guests_count: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label>Valor Total *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.total_amount}
                  onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <Button 
                type="button" 
                variant="outline"
                onClick={calculateTotal}
                className="flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Calcular
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Origem</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Reserva Direta</SelectItem>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="vrbo">VRBO</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="confirmed">Confirmada</SelectItem>
                  <SelectItem value="checked_in">Hospedado</SelectItem>
                  <SelectItem value="checked_out">Finalizada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Anotações sobre a reserva..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {reservation ? 'Salvar' : 'Criar Reserva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}