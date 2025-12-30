import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, differenceInDays, isWithinInterval, isSameDay, eachDayOfInterval, isWeekend, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock,
  Users,
  Wifi,
  Wind,
  Tv,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Calendar,
  Home
} from "lucide-react";
import CalendarGrid from '@/components/reservations/CalendarGrid';

export default function PublicBooking() {
  const [step, setStep] = useState(1);
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [selectedDates, setSelectedDates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guests_count: 1,
    notes: ''
  });

  const urlParams = new URLSearchParams(window.location.search);
  const companySlug = urlParams.get('c');

  useEffect(() => {
    let hasRedirected = false;
    
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (!isAuth && !hasRedirected) {
          hasRedirected = true;
          base44.auth.redirectToLogin(`${window.location.origin}/PublicBooking?c=${companySlug || ''}`);
          return;
        }
        const userData = await base44.auth.me();
        setUser(userData);
        setFormData(prev => ({
          ...prev,
          guest_name: userData.full_name || '',
          guest_email: userData.email || ''
        }));
        setCheckingAuth(false);
      } catch (error) {
        if (!hasRedirected) {
          hasRedirected = true;
          base44.auth.redirectToLogin(`${window.location.origin}/PublicBooking?c=${companySlug || ''}`);
        }
      }
    };
    checkAuth();
  }, [companySlug]);

  const { data: companies = [], isLoading: loadingCompany, error: companyError } = useQuery({
    queryKey: ['company-public', companySlug],
    queryFn: async () => {
      if (!companySlug) return [];
      return await base44.entities.Company.filter({ slug: companySlug });
    },
    enabled: !!companySlug && !!user,
    retry: 1
  });

  const company = companies[0];

  const { data: accommodations = [] } = useQuery({
    queryKey: ['accommodations-public', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Accommodation.filter({ company_id: company.id, status: 'active' });
    },
    enabled: !!company?.id
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations-public', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Reservation.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-public', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.BlockedDate.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const filteredReservations = useMemo(() => {
    if (!selectedAccommodation) return reservations;
    return reservations.filter(r => 
      r.accommodation_id === selectedAccommodation.id && r.status !== 'cancelled'
    );
  }, [reservations, selectedAccommodation]);

  const filteredBlockedDates = useMemo(() => {
    if (!selectedAccommodation) return blockedDates;
    return blockedDates.filter(b => b.accommodation_id === selectedAccommodation.id);
  }, [blockedDates, selectedAccommodation]);

  const calculateTotal = () => {
    if (!selectedDates || !selectedAccommodation) return 0;
    
    const days = eachDayOfInterval({ 
      start: selectedDates.start, 
      end: addDays(selectedDates.end, -1) 
    });
    
    let total = 0;
    days.forEach(day => {
      if (isWeekend(day) && selectedAccommodation.weekend_price) {
        total += selectedAccommodation.weekend_price;
      } else {
        total += selectedAccommodation.base_price || 0;
      }
    });

    return total;
  };

  const nights = selectedDates 
    ? differenceInDays(selectedDates.end, selectedDates.start)
    : 0;

  const handleDateSelect = (range) => {
    setSelectedDates(range);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find or create guest - always create/update if email provided
      let guestId = null;
      
      if (formData.guest_email) {
        const existingGuests = await base44.entities.Guest.filter({ 
          company_id: company.id, 
          email: formData.guest_email 
        });

        if (existingGuests.length > 0) {
          guestId = existingGuests[0].id;
          // Update guest info
          await base44.entities.Guest.update(guestId, {
            name: formData.guest_name,
            phone: formData.guest_phone
          });
        } else {
          // Create new guest
          const newGuest = await base44.entities.Guest.create({
            company_id: company.id,
            name: formData.guest_name,
            email: formData.guest_email,
            phone: formData.guest_phone
          });
          guestId = newGuest.id;
        }
      }

      // Create reservation
      await base44.entities.Reservation.create({
        company_id: company.id,
        accommodation_id: selectedAccommodation.id,
        guest_id: guestId,
        check_in: format(selectedDates.start, 'yyyy-MM-dd'),
        check_out: format(selectedDates.end, 'yyyy-MM-dd'),
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone,
        guests_count: parseInt(formData.guests_count) || 1,
        notes: formData.notes,
        total_amount: calculateTotal(),
        source: 'direct',
        status: 'pending'
      });

      setLoading(false);
      setSuccess(true);
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      setLoading(false);
      alert('Erro ao processar reserva. Por favor, tente novamente.');
    }
  };

  if (checkingAuth || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!companySlug) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Link Inválido</h2>
            <p className="text-slate-500">Este link de reserva não é válido.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingCompany) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Empresa não encontrada</h2>
            <p className="text-slate-500">Não foi possível encontrar uma empresa com este link. Verifique se o link está correto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-slate-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Check className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Reserva Enviada!</h2>
            <p className="text-slate-600 mb-4">
              Sua solicitação de reserva foi enviada com sucesso. Você receberá a confirmação em breve.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 text-left space-y-2">
              <p className="text-sm"><strong>Acomodação:</strong> {selectedAccommodation?.name}</p>
              <p className="text-sm">
                <strong>Check-in:</strong> {format(selectedDates.start, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm">
                <strong>Check-out:</strong> {format(selectedDates.end, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm"><strong>Total:</strong> R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            {company.payment_instructions && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg text-left">
                <p className="text-sm font-medium text-amber-800 mb-1">Instruções de Pagamento:</p>
                <p className="text-sm text-amber-700 whitespace-pre-line">{company.payment_instructions}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {company.logo_url && (
              <img src={company.logo_url} alt={company.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-800">{company.name}</h1>
              {(company.city || company.state) && (
                <p className="text-slate-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {[company.city, company.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
          {company.description && (
            <p className="text-slate-600 mt-4">{company.description}</p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium shadow-sm ${
                step >= s ? 'bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {s}
              </div>
              <span className={`text-xs sm:text-sm whitespace-nowrap ${step >= s ? 'text-slate-800' : 'text-slate-400'}`}>
                {s === 1 ? 'Escolha' : s === 2 ? 'Datas' : 'Dados'}
              </span>
              {s < 3 && <div className="w-8 sm:w-12 h-0.5 bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Step 1: Choose Accommodation */}
        {step === 1 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4 sm:mb-6">Escolha sua Acomodação</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {accommodations.map(acc => (
                <Card 
                  key={acc.id} 
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    selectedAccommodation?.id === acc.id ? 'ring-2 ring-emerald-500' : ''
                  }`}
                  onClick={() => setSelectedAccommodation(acc)}
                >
                  <div className="aspect-video relative bg-slate-100">
                    {acc.images?.[0] ? (
                      <img src={acc.images[0]} alt={acc.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-12 h-12 text-slate-300" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg text-slate-800">{acc.name}</h3>
                    {acc.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{acc.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Users className="w-4 h-4" />
                        Até {acc.max_guests} hóspedes
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">
                          R$ {acc.base_price?.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-400">por noite</p>
                      </div>
                    </div>
                    {acc.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {acc.amenities.slice(0, 4).map(amenity => (
                          <Badge key={amenity} variant="secondary" className="text-xs">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedAccommodation}
                className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md"
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Dates */}
        {step === 2 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4 sm:mb-6">Selecione as Datas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <CalendarGrid
                  reservations={filteredReservations}
                  blockedDates={filteredBlockedDates}
                  onDateRangeSelect={handleDateSelect}
                  accommodationId={selectedAccommodation?.id}
                  minDate={new Date()}
                />
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        {selectedAccommodation?.images?.[0] && (
                          <img 
                            src={selectedAccommodation.images[0]} 
                            alt="" 
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-slate-800">{selectedAccommodation?.name}</p>
                          <p className="text-sm text-slate-500">
                            R$ {selectedAccommodation?.base_price?.toFixed(2)}/noite
                          </p>
                        </div>
                      </div>

                      {selectedDates && (
                        <>
                          <div className="border-t pt-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-600">Check-in</span>
                              <span className="font-medium">
                                {format(selectedDates.start, "dd 'de' MMM", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-600">Check-out</span>
                              <span className="font-medium">
                                {format(selectedDates.end, "dd 'de' MMM", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Noites</span>
                              <span className="font-medium">{nights}</span>
                            </div>
                          </div>
                          <div className="border-t pt-4">
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-800">Total</span>
                              <span className="font-bold text-xl text-emerald-600">
                                R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedDates || nights < (selectedAccommodation?.min_nights || 1)}
                className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md"
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Guest Data */}
        {step === 3 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4 sm:mb-6">Seus Dados</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <Card>
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label>Nome Completo *</Label>
                        <Input
                          value={formData.guest_name}
                          onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Email *</Label>
                          <Input
                            type="email"
                            value={formData.guest_email}
                            onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Telefone *</Label>
                          <Input
                            value={formData.guest_phone}
                            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                            placeholder="(00) 00000-0000"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Número de Hóspedes</Label>
                        <Input
                          type="number"
                          min="1"
                          max={selectedAccommodation?.max_guests || 10}
                          value={formData.guests_count}
                          onChange={(e) => setFormData({ ...formData, guests_count: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Observações</Label>
                        <Input
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Alguma observação especial?"
                        />
                      </div>

                      {company.cancellation_policy && (
                        <div className="p-4 bg-slate-50 rounded-lg">
                          <p className="text-sm font-medium text-slate-700 mb-1">Política de Cancelamento</p>
                          <p className="text-sm text-slate-600 whitespace-pre-line">{company.cancellation_policy}</p>
                        </div>
                      )}

                      <div className="flex justify-between pt-4">
                        <Button type="button" variant="outline" onClick={() => setStep(2)}>
                          <ChevronLeft className="w-4 h-4 mr-2" />
                          Voltar
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={loading}
                          className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md"
                        >
                          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Confirmar Reserva
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Summary */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo da Reserva</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium text-slate-800">{selectedAccommodation?.name}</p>
                      </div>
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Check-in</span>
                          <span>{format(selectedDates.start, "dd/MM/yyyy")} às {company.check_in_time || '14:00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Check-out</span>
                          <span>{format(selectedDates.end, "dd/MM/yyyy")} às {company.check_out_time || '12:00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">{nights} noite(s)</span>
                          <span>R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="border-t pt-4">
                        <div className="flex justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="font-bold text-xl text-emerald-600">
                            R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
            {company.phone && (
              <a href={`tel:${company.phone}`} className="flex items-center gap-1 hover:text-emerald-600">
                <Phone className="w-4 h-4" />
                {company.phone}
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="flex items-center gap-1 hover:text-emerald-600">
                <Mail className="w-4 h-4" />
                {company.email}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}