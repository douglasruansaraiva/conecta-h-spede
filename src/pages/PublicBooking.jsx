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
  Home,
  X
} from "lucide-react";
import CalendarGrid from '@/components/reservations/CalendarGrid';

export default function PublicBooking() {
  const [step, setStep] = useState(1); // 1: list, 1.5: details, 2: dates, 3: form
  const [selectedAccommodation, setSelectedAccommodation] = useState(null);
  const [selectedDates, setSelectedDates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-lg border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {company.logo_url && (
              <img src={company.logo_url} alt={company.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover ring-2 ring-emerald-500/20" />
            )}
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">{company.name}</h1>
              {(company.city || company.state) && (
                <p className="text-slate-400 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {[company.city, company.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
          {company.description && (
            <p className="text-slate-300 mt-4">{company.description}</p>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {step !== 1.5 && (
          <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium shadow-sm ${
                  step >= s ? 'bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {s}
                </div>
                <span className={`text-xs sm:text-sm whitespace-nowrap ${step >= s ? 'text-white' : 'text-slate-500'}`}>
                  {s === 1 ? 'Escolha' : s === 2 ? 'Datas' : 'Dados'}
                </span>
                {s < 3 && <div className="w-8 sm:w-12 h-0.5 bg-slate-700" />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Choose Accommodation */}
        {step === 1 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Escolha sua Acomodação</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {accommodations.map(acc => (
                <Card 
                  key={acc.id} 
                  className="group cursor-pointer transition-all hover:shadow-2xl hover:shadow-emerald-500/10 bg-slate-800/50 backdrop-blur border-slate-700 overflow-hidden"
                  onClick={() => {
                    setSelectedAccommodation(acc);
                    setCurrentImageIndex(0);
                    setStep(1.5);
                  }}
                >
                  <div className="aspect-video relative bg-slate-900 overflow-hidden">
                    {acc.images?.[0] ? (
                      <img src={acc.images[0]} alt={acc.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-12 h-12 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg text-white">{acc.name}</h3>
                    {acc.description && (
                      <p className="text-sm text-slate-400 mt-1 line-clamp-2">{acc.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <Users className="w-4 h-4" />
                        Até {acc.max_guests} hóspedes
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-400">
                          R$ {acc.base_price?.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500">por noite</p>
                      </div>
                    </div>
                    {acc.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {acc.amenities.slice(0, 3).map(amenity => (
                          <Badge key={amenity} className="text-xs bg-slate-700/50 text-slate-300 border-slate-600">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 1.5: Accommodation Details */}
        {step === 1.5 && selectedAccommodation && (
          <div className="max-w-5xl mx-auto">
            <Button 
              variant="ghost" 
              onClick={() => setStep(1)}
              className="mb-4 text-slate-400 hover:text-white text-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>

            {/* Gallery */}
            <div className="relative aspect-video mb-4 sm:mb-6 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900">
              {selectedAccommodation.images?.[currentImageIndex] ? (
                <img
                  src={selectedAccommodation.images[currentImageIndex]}
                  alt={selectedAccommodation.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Home className="w-12 sm:w-16 h-12 sm:h-16 text-slate-600" />
                </div>
              )}

              {selectedAccommodation.images?.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                    disabled={currentImageIndex === 0}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(Math.min(selectedAccommodation.images.length - 1, currentImageIndex + 1))}
                    disabled={currentImageIndex === selectedAccommodation.images.length - 1}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </button>
                  
                  <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-white text-xs sm:text-sm">
                    {currentImageIndex + 1} / {selectedAccommodation.images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {selectedAccommodation.images?.length > 1 && (
              <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {selectedAccommodation.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      currentImageIndex === idx ? 'border-emerald-500' : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Info Card */}
            <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
                      {selectedAccommodation.name}
                    </h1>
                    <div className="flex items-center gap-3 sm:gap-4 text-sm sm:text-base text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Até {selectedAccommodation.max_guests} hóspedes
                      </span>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-emerald-400">
                      R$ {selectedAccommodation.base_price?.toFixed(2)}
                    </p>
                    <p className="text-sm sm:text-base text-slate-400">por noite</p>
                    {selectedAccommodation.weekend_price && selectedAccommodation.weekend_price !== selectedAccommodation.base_price && (
                      <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Fins de semana: R$ {selectedAccommodation.weekend_price.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {selectedAccommodation.description && (
                  <div className="mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Descrição</h3>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
                      {selectedAccommodation.description}
                    </p>
                  </div>
                )}

                {selectedAccommodation.amenities?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-white mb-3">Comodidades</h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {selectedAccommodation.amenities.map(amenity => (
                        <Badge key={amenity} className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 px-2.5 sm:px-3 py-1 text-xs sm:text-sm">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAccommodation.min_nights > 1 && (
                  <div className="mb-6 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-300 text-xs sm:text-sm">
                      <strong>Mínimo:</strong> {selectedAccommodation.min_nights} noites
                    </p>
                  </div>
                )}

                <Button 
                  onClick={() => setStep(2)}
                  size="lg"
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 h-12 sm:h-14 text-sm sm:text-base"
                >
                  Escolher Datas
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Choose Dates */}
        {step === 2 && (
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Selecione as Datas</h2>
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
                <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Resumo</CardTitle>
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
                          <p className="font-medium text-white">{selectedAccommodation?.name}</p>
                          <p className="text-sm text-slate-400">
                            R$ {selectedAccommodation?.base_price?.toFixed(2)}/noite
                          </p>
                        </div>
                      </div>

                      {selectedDates && (
                        <>
                          <div className="border-t border-slate-700 pt-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-400">Check-in</span>
                              <span className="font-medium text-white">
                                {format(selectedDates.start, "dd 'de' MMM", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-400">Check-out</span>
                              <span className="font-medium text-white">
                                {format(selectedDates.end, "dd 'de' MMM", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Noites</span>
                              <span className="font-medium text-white">{nights}</span>
                            </div>
                          </div>
                          <div className="border-t border-slate-700 pt-4">
                            <div className="flex justify-between">
                              <span className="font-semibold text-white">Total</span>
                              <span className="font-bold text-xl text-emerald-400">
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
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4 sm:mb-6">Seus Dados</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label className="text-white">Nome Completo *</Label>
                        <Input
                          value={formData.guest_name}
                          onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-white">Email *</Label>
                          <Input
                            type="email"
                            value={formData.guest_email}
                            onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-white">Telefone *</Label>
                          <Input
                            value={formData.guest_phone}
                            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                            placeholder="(00) 00000-0000"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-white">Número de Hóspedes</Label>
                        <Input
                          type="number"
                          min="1"
                          max={selectedAccommodation?.max_guests || 10}
                          value={formData.guests_count}
                          onChange={(e) => setFormData({ ...formData, guests_count: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label className="text-white">Observações</Label>
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
                <Card className="bg-slate-800/50 backdrop-blur border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Resumo da Reserva</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium text-white">{selectedAccommodation?.name}</p>
                      </div>
                      <div className="border-t border-slate-700 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Check-in</span>
                          <span className="text-white">{format(selectedDates.start, "dd/MM/yyyy")} às {company.check_in_time || '14:00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Check-out</span>
                          <span className="text-white">{format(selectedDates.end, "dd/MM/yyyy")} às {company.check_out_time || '12:00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">{nights} noite(s)</span>
                          <span className="text-white">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-700 pt-4">
                        <div className="flex justify-between">
                          <span className="font-semibold text-white">Total</span>
                          <span className="font-bold text-xl text-emerald-400">
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
      <div className="bg-slate-900/50 backdrop-blur border-t border-slate-700 mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            {company.phone && (
              <a href={`tel:${company.phone}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                <Phone className="w-4 h-4" />
                {company.phone}
              </a>
            )}
            {company.email && (
              <a href={`mailto:${company.email}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
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