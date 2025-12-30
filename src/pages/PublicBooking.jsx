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
  X,
  Star,
  MessageCircle,
  Shield,
  DollarSign,
  Gift,
  ChevronDown
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

  // Facebook Pixel tracking
  useEffect(() => {
    if (company?.facebook_pixel_id) {
      // Initialize Facebook Pixel
      if (!window.fbq) {
        (function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js'));
      }
      
      window.fbq('init', company.facebook_pixel_id);
      window.fbq('track', 'PageView');
    }
  }, [company]);

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
      console.log('Buscando empresa com slug:', companySlug);
      const result = await base44.entities.Company.filter({ slug: companySlug });
      console.log('Empresas encontradas:', result);
      return result;
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
      
      // Track Lead event on Facebook Pixel
      if (company?.facebook_pixel_id && window.fbq) {
        window.fbq('track', 'Lead', {
          content_name: selectedAccommodation.name,
          value: calculateTotal(),
          currency: 'BRL'
        });
      }
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      setLoading(false);
      alert('Erro ao processar reserva. Por favor, tente novamente.');
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Autenticando...</p>
          </CardContent>
        </Card>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
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
      <div className="bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex items-center gap-3 sm:gap-4">
            {company.logo_url && (
              <img src={company.logo_url} alt={company.name} className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover ring-2 ring-emerald-500/20" />
            )}
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-slate-800">{company.name}</h1>
              {(company.city || company.state) && (
                <p className="text-slate-600 flex items-center gap-1">
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
        {step !== 1.5 && (
          <div className="flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8 overflow-x-auto">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium shadow-sm ${
                  step >= s ? 'bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] text-white' : 'bg-slate-200 text-slate-500'
                }`}>
                  {s}
                </div>
                <span className={`text-xs sm:text-sm whitespace-nowrap ${step >= s ? 'text-slate-800' : 'text-slate-500'}`}>
                  {s === 1 ? 'Escolha' : s === 2 ? 'Datas' : 'Dados'}
                </span>
                {s < 3 && <div className="w-8 sm:w-12 h-0.5 bg-slate-300" />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Choose Accommodation */}
        {step === 1 && (
          <div>
            {/* Benefits Section */}
            {company.benefits?.length > 0 && (
              <div className="mb-8 sm:mb-12 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-6 sm:p-8 border border-emerald-200">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-4 text-center">
                  Por que Reservar Direto Conosco?
                </h2>
                <div className={`grid grid-cols-1 ${company.benefits.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-4`}>
                  {company.benefits.map((benefit, index) => {
                    const IconComponent = benefit.icon === 'DollarSign' ? DollarSign : benefit.icon === 'Gift' ? Gift : Shield;
                    return (
                      <div key={index} className="flex items-start gap-3 bg-white/80 p-4 rounded-xl">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 mb-1">{benefit.title}</h3>
                          <p className="text-sm text-slate-600">{benefit.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4 sm:mb-6">Escolha sua Acomodação</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {accommodations.map(acc => (
                <Card 
                  key={acc.id} 
                  className="group transition-all hover:shadow-xl bg-white border-slate-200 overflow-hidden flex flex-col"
                >
                  <div 
                    className="aspect-video relative bg-slate-900 overflow-hidden cursor-pointer"
                    onClick={() => {
                      setSelectedAccommodation(acc);
                      setCurrentImageIndex(0);
                      setStep(1.5);
                    }}
                  >
                    {acc.images?.[0] ? (
                      <img src={acc.images[0]} alt={acc.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-12 h-12 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-60" />
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg text-slate-800">{acc.name}</h3>
                    {acc.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{acc.description}</p>
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
                        <p className="text-xs text-slate-500">por noite</p>
                      </div>
                    </div>
                    {acc.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {acc.amenities.slice(0, 3).map(amenity => (
                          <Badge key={amenity} className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                            {amenity}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Button 
                      onClick={() => {
                        setSelectedAccommodation(acc);
                        setCurrentImageIndex(0);
                        setStep(1.5);
                      }}
                      className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-md font-semibold group-hover:shadow-lg transition-all"
                    >
                      Ver Detalhes e Reservar
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Testimonials Section */}
            {company.testimonials?.length > 0 && (
              <div className="mt-12 sm:mt-16">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 text-center">
                  O que nossos hóspedes dizem
                </h2>
                <div className={`grid grid-cols-1 ${company.testimonials.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-6`}>
                  {company.testimonials.map((testimonial, index) => (
                    <Card key={index} className="bg-white border-slate-200">
                      <CardContent className="p-6">
                        <div className="flex gap-1 mb-3">
                          {Array.from({ length: testimonial.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        <p className="text-slate-600 text-sm mb-4">
                          "{testimonial.text}"
                        </p>
                        <p className="font-semibold text-slate-800">{testimonial.name}</p>
                        <p className="text-xs text-slate-500">{testimonial.date}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ Section */}
            {company.faqs?.length > 0 && (
              <div className="mt-12 sm:mt-16">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-6 text-center">
                  Perguntas Frequentes
                </h2>
                <div className="space-y-4 max-w-3xl mx-auto">
                  {company.faqs.map((faq, index) => (
                    <details key={index} className="bg-white border border-slate-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow">
                      <summary className="font-semibold text-slate-800 flex items-center justify-between">
                        {faq.question}
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      </summary>
                      <p className="text-slate-600 text-sm mt-3 pl-2 whitespace-pre-line">
                        {faq.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1.5: Accommodation Details */}
        {step === 1.5 && selectedAccommodation && (
          <div className="max-w-5xl mx-auto">
            <Button 
              variant="ghost" 
              onClick={() => setStep(1)}
              className="mb-4 text-slate-600 hover:text-slate-800 text-sm"
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
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
                      {selectedAccommodation.name}
                    </h1>
                    <div className="flex items-center gap-3 sm:gap-4 text-sm sm:text-base text-slate-600">
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
                    <p className="text-sm sm:text-base text-slate-600">por noite</p>
                    {selectedAccommodation.weekend_price && selectedAccommodation.weekend_price !== selectedAccommodation.base_price && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-1">
                        Fins de semana: R$ {selectedAccommodation.weekend_price.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {selectedAccommodation.description && (
                  <div className="mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-2">Descrição</h3>
                    <p className="text-sm sm:text-base text-slate-600 leading-relaxed whitespace-pre-line">
                      {selectedAccommodation.description}
                    </p>
                  </div>
                )}

                {selectedAccommodation.amenities?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-3">Comodidades</h3>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {selectedAccommodation.amenities.map(amenity => (
                        <Badge key={amenity} className="bg-emerald-100 text-emerald-700 border-emerald-200 px-2.5 sm:px-3 py-1 text-xs sm:text-sm">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedAccommodation.min_nights > 1 && (
                  <div className="mb-6 p-3 sm:p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-amber-700 text-xs sm:text-sm">
                      <strong>Mínimo:</strong> {selectedAccommodation.min_nights} noites
                    </p>
                  </div>
                )}

                <Button 
                  onClick={() => setStep(2)}
                  size="lg"
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white shadow-lg shadow-emerald-500/20 h-12 sm:h-14 text-sm sm:text-base font-semibold"
                >
                  Reservar Agora - Escolher Datas
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                </Button>
              </CardContent>
            </Card>
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
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-800">Resumo</CardTitle>
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
                          <p className="text-sm text-slate-600">
                            R$ {selectedAccommodation?.base_price?.toFixed(2)}/noite
                          </p>
                        </div>
                      </div>

                      {selectedDates && (
                        <>
                          <div className="border-t border-slate-200 pt-4">
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-600">Check-in</span>
                              <span className="font-medium text-slate-800">
                                {format(selectedDates.start, "dd 'de' MMM", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-600">Check-out</span>
                              <span className="font-medium text-slate-800">
                                {format(selectedDates.end, "dd 'de' MMM", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Noites</span>
                              <span className="font-medium text-slate-800">{nights}</span>
                            </div>
                            </div>
                            <div className="border-t border-slate-200 pt-4">
                            <div className="flex justify-between">
                              <span className="font-semibold text-slate-800">Total</span>
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
            <h2 className="text-lg sm:text-xl font-semibold text-slate-800 mb-4 sm:mb-6">Seus Dados</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="lg:col-span-2">
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <Label className="text-slate-700 mb-2 block">Nome Completo *</Label>
                        <Input
                          value={formData.guest_name}
                          onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                          required
                          className="bg-white border-slate-300"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-slate-700 mb-2 block">Email *</Label>
                          <Input
                            type="email"
                            value={formData.guest_email}
                            onChange={(e) => setFormData({ ...formData, guest_email: e.target.value })}
                            required
                            className="bg-white border-slate-300"
                          />
                        </div>
                        <div>
                          <Label className="text-slate-700 mb-2 block">Telefone *</Label>
                          <Input
                            value={formData.guest_phone}
                            onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                            placeholder="(00) 00000-0000"
                            required
                            className="bg-white border-slate-300"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-slate-700 mb-2 block">Número de Hóspedes</Label>
                        <Input
                          type="number"
                          min="1"
                          max={selectedAccommodation?.max_guests || 10}
                          value={formData.guests_count}
                          onChange={(e) => setFormData({ ...formData, guests_count: e.target.value })}
                          className="bg-white border-slate-300"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-700 mb-2 block">Observações</Label>
                        <Input
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Alguma observação especial?"
                          className="bg-white border-slate-300"
                        />
                      </div>

                      {company.cancellation_policy && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <p className="text-sm font-medium text-emerald-700 mb-1">Política de Cancelamento</p>
                          <p className="text-sm text-slate-700 whitespace-pre-line">{company.cancellation_policy}</p>
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
                <Card className="bg-white border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-800">Resumo da Reserva</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="font-medium text-slate-800">{selectedAccommodation?.name}</p>
                      </div>
                      <div className="border-t border-slate-200 pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Check-in</span>
                          <span className="text-slate-800">{format(selectedDates.start, "dd/MM/yyyy")} às {company.check_in_time || '14:00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Check-out</span>
                          <span className="text-slate-800">{format(selectedDates.end, "dd/MM/yyyy")} às {company.check_out_time || '12:00'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">{nights} noite(s)</span>
                          <span className="text-slate-800">R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="border-t border-slate-200 pt-4">
                        <div className="flex justify-between">
                          <span className="font-semibold text-slate-800">Total</span>
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

      {/* WhatsApp Float Button */}
      {company.phone && (
        <a
          href={`https://wa.me/${company.phone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-50 animate-bounce"
          title="Fale conosco no WhatsApp"
        >
          <MessageCircle className="w-7 h-7" />
        </a>
      )}

      {/* Footer */}
      <div className="bg-white/80 backdrop-blur border-t border-slate-200 mt-8 sm:mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center gap-2 hover:text-[#2C5F5D] transition-colors">
                  <Phone className="w-4 h-4" />
                  {company.phone}
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-2 hover:text-[#2C5F5D] transition-colors">
                  <Mail className="w-4 h-4" />
                  {company.email}
                </a>
              )}
              {company.phone && (
                <a 
                  href={`https://wa.me/${company.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors font-medium"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </a>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} {company.name}. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}