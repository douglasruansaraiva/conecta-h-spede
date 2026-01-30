import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [dateError, setDateError] = useState('');
  const [guestMode, setGuestMode] = useState('new'); // 'new' or 'existing'
  const [selectedGuestId, setSelectedGuestId] = useState('');
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

  const { data: existingGuests = [] } = useQuery({
    queryKey: ['guests', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return await base44.entities.Guest.filter({ company_id: companyId });
    },
    enabled: !!companyId && open
  });

  const handleGuestSelect = (guestId) => {
    setSelectedGuestId(guestId);
    const guest = existingGuests.find(g => g.id === guestId);
    if (guest) {
      setFormData(prev => ({
        ...prev,
        guest_name: guest.name || '',
        guest_email: guest.email || '',
        guest_phone: guest.phone || ''
      }));
    }
  };

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

  const checkDateAvailability = async () => {
    if (!formData.check_in || !formData.check_out || !formData.accommodation_id) {
      setDateError('');
      return true;
    }

    const checkIn = parseISO(formData.check_in);
    const checkOut = parseISO(formData.check_out);
    
    // Check minimum nights
    const accommodation = accommodations.find(a => a.id === formData.accommodation_id);
    const nights = differenceInDays(checkOut, checkIn);
    const minNights = accommodation?.min_nights || 1;
    
    if (nights < minNights) {
      setDateError(`Estadia mínima: ${minNights} ${minNights === 1 ? 'noite' : 'noites'}`);
      return false;
    }

    // Get all reservations for this accommodation
    const allReservations = await base44.entities.Reservation.filter({ 
      company_id: companyId,
      accommodation_id: formData.accommodation_id
    });

    // Get blocked dates for this accommodation
    const allBlockedDates = await base44.entities.BlockedDate.filter({ 
      company_id: companyId,
      accommodation_id: formData.accommodation_id
    });

    // Check conflicts with other reservations (exclude current if editing)
    const hasReservationConflict = allReservations.some(r => {
      if (reservation && r.id === reservation.id) return false; // Skip current reservation
      if (r.status === 'cancelled') return false;

      const rCheckIn = parseISO(r.check_in);
      const rCheckOut = parseISO(r.check_out);

      return (
        (checkIn >= rCheckIn && checkIn < rCheckOut) ||
        (checkOut > rCheckIn && checkOut <= rCheckOut) ||
        (checkIn <= rCheckIn && checkOut >= rCheckOut)
      );
    });

    if (hasReservationConflict) {
      setDateError('Período indisponível - já existe uma reserva nessas datas');
      return false;
    }

    // Check conflicts with blocked dates
    const hasBlockedConflict = allBlockedDates.some(b => {
      const bStart = parseISO(b.start_date);
      const bEnd = parseISO(b.end_date);

      return (
        (checkIn >= bStart && checkIn <= bEnd) ||
        (checkOut >= bStart && checkOut <= bEnd) ||
        (checkIn <= bStart && checkOut >= bEnd)
      );
    });

    if (hasBlockedConflict) {
      setDateError('Período bloqueado - não é possível reservar nessas datas');
      return false;
    }

    setDateError('');
    return true;
  };

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

    // Check date availability only if dates changed or it's a new reservation
    const datesChanged = !reservation || 
      reservation.check_in !== formData.check_in || 
      reservation.check_out !== formData.check_out ||
      reservation.accommodation_id !== formData.accommodation_id;
    
    if (datesChanged) {
      const isAvailable = await checkDateAvailability();
      if (!isAvailable) {
        setLoading(false);
        return;
      }
    }

    // Find or create guest if email is provided
    let guestId = reservation?.guest_id;
    
    // Se estiver editando reserva do Booking/Airbnb, sempre criar novo hóspede
    const isExternalReservation = reservation && (formData.source === 'booking' || formData.source === 'airbnb');
    
    if (guestMode === 'existing' && selectedGuestId && !isExternalReservation) {
      // Use selected existing guest
      guestId = selectedGuestId;
    } else if (formData.guest_email) {
      // Normalize email before saving
      const normalizedEmail = formData.guest_email.toLowerCase().trim();
      
      if (isExternalReservation) {
        // Para reservas do Booking/Airbnb sendo editadas, sempre criar novo hóspede
        // mas verificar se já não existe para não duplicar
        const existingGuests = await base44.entities.Guest.filter({ 
          company_id: companyId, 
          email: normalizedEmail 
        });

        if (existingGuests.length > 0) {
          // Se já existe hóspede com esse email, usar ele
          guestId = existingGuests[0].id;
        } else {
          // Criar novo hóspede
          const newGuest = await base44.entities.Guest.create({
            company_id: companyId,
            name: formData.guest_name,
            email: normalizedEmail,
            phone: formData.guest_phone
          });
          guestId = newGuest.id;
        }
      } else {
        // Comportamento normal para outras reservas
        const existingGuests = await base44.entities.Guest.filter({ 
          company_id: companyId, 
          email: normalizedEmail 
        });

        if (existingGuests.length > 0) {
          guestId = existingGuests[0].id;
          // Update guest info
          await base44.entities.Guest.update(guestId, {
            name: formData.guest_name,
            phone: formData.guest_phone
          });
        } else {
          // Create new guest only if doesn't exist
          const newGuest = await base44.entities.Guest.create({
            company_id: companyId,
            name: formData.guest_name,
            email: normalizedEmail,
            phone: formData.guest_phone
          });
          guestId = newGuest.id;
        }
      }
    }

    // Converter valor para formato numérico (aceita formato BR e US)
    let totalAmount = 0;
    if (formData.total_amount) {
      const valueStr = String(formData.total_amount);
      // Se tem vírgula, assume formato BR (2.370,00 ou 370,00)
      if (valueStr.includes(',')) {
        totalAmount = parseFloat(valueStr.replace(/\./g, '').replace(',', '.'));
      } else {
        // Formato US (2370.00 ou 2370)
        totalAmount = parseFloat(valueStr);
      }
    }

    const data = {
      ...formData,
      company_id: companyId,
      guest_id: guestId,
      guests_count: parseInt(formData.guests_count) || 1,
      total_amount: totalAmount
    };

    let savedReservation;
    if (reservation) {
      savedReservation = await base44.entities.Reservation.update(reservation.id, data);
    } else {
      savedReservation = await base44.entities.Reservation.create(data);
    }

    // Enviar email de confirmação se for reserva nova e tiver email
    if (!reservation && formData.guest_email) {
      try {
        // Buscar dados da empresa
        const companies = await base44.entities.Company.filter({ id: companyId });
        const company = companies[0];
        
        // Buscar nome da acomodação
        const accommodation = accommodations.find(a => a.id === formData.accommodation_id);
        
        // Email será enviado apenas quando um pagamento for registrado
        // através do PaymentForm
      } catch (error) {
        console.error('Erro ao enviar email:', error);
      }
    }

    setLoading(false);
    onSave();
    onClose();
    
    // Show success toast
    const { toast } = await import("sonner");
    toast.success(reservation ? 'Reserva atualizada!' : 'Reserva criada e email enviado!');
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
                {accommodations?.filter(acc => acc.status === 'active').map(acc => (
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
                onChange={(e) => {
                  setFormData({ ...formData, check_in: e.target.value });
                  setDateError('');
                }}
                onBlur={checkDateAvailability}
                required
              />
            </div>
            <div>
              <Label>Check-out *</Label>
              <Input
                type="date"
                value={formData.check_out}
                onChange={(e) => {
                  setFormData({ ...formData, check_out: e.target.value });
                  setDateError('');
                }}
                onBlur={checkDateAvailability}
                min={formData.check_in}
                required
              />
            </div>
          </div>

          {dateError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {dateError}
            </div>
          )}

          {nights > 0 && !dateError && (
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
              {nights} {nights === 1 ? 'noite' : 'noites'} de hospedagem
            </div>
          )}

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-slate-800">Dados do Hóspede</h4>
              <Tabs value={guestMode} onValueChange={setGuestMode}>
                <TabsList className="h-8">
                  <TabsTrigger value="new" className="text-xs">Novo</TabsTrigger>
                  <TabsTrigger value="existing" className="text-xs">Existente</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="space-y-3">
              {guestMode === 'existing' && existingGuests.length > 0 && (
                <div>
                  <Label>Selecionar Hóspede</Label>
                  <Select value={selectedGuestId} onValueChange={handleGuestSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha um hóspede..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingGuests.map(guest => (
                        <SelectItem key={guest.id} value={guest.id}>
                          {guest.name} {guest.email ? `(${guest.email})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {guestMode === 'existing' && existingGuests.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                  Nenhum hóspede cadastrado ainda. Mude para "Novo" para cadastrar.
                </div>
              )}
              
              <div>
                <Label>Nome *</Label>
                <Input
                  value={formData.guest_name}
                  onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                  placeholder="Nome completo"
                  required
                  disabled={guestMode === 'existing' && !selectedGuestId}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => setFormData({ ...formData, guest_email: e.target.value.toLowerCase().trim() })}
                    placeholder="email@exemplo.com"
                    disabled={guestMode === 'existing' && !selectedGuestId}
                  />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    disabled={guestMode === 'existing' && !selectedGuestId}
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
                <Label>Valor Total (R$) *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.total_amount}
                  onChange={(e) => {
                    // Permite apenas números, vírgula e ponto
                    const value = e.target.value.replace(/[^\d.,]/g, '');
                    setFormData({ ...formData, total_amount: value });
                  }}
                  placeholder="Ex: 2.370,00 ou 2370.00"
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
            <Button type="submit" disabled={loading || !!dateError} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {reservation ? 'Salvar Alterações' : 'Criar Reserva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}