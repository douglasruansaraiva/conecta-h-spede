import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isToday, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CalendarDays, 
  DollarSign, 
  Home, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ExternalLink,
  Copy,
  Check,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '@/components/dashboard/StatsCard';
import ReservationCard from '@/components/reservations/ReservationCard';
import CalendarGrid from '@/components/reservations/CalendarGrid';
import CompanyGuard from '@/components/auth/CompanyGuard';

function DashboardContent({ user, company }) {
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: accommodations = [] } = useQuery({
    queryKey: ['accommodations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Accommodation.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Reservation.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Transaction.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blockedDates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const dates = await base44.entities.BlockedDate.filter({ company_id: company.id });
      console.log(`\n📊 [Dashboard ${company.name}] BlockedDates carregadas:`, dates.length);
      console.log('   Detalhes:', dates.map(d => ({
        accommodation: accommodations.find(a => a.id === d.accommodation_id)?.name || d.accommodation_id,
        start: d.start_date,
        end: d.end_date,
        source: d.source,
        reason: d.reason?.substring(0, 30)
      })));
      return dates;
    },
    enabled: !!company?.id
  });

  // Stats calculations
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const monthlyReservations = reservations.filter(r => {
    const checkIn = parseISO(r.check_in);
    return isWithinInterval(checkIn, { start: monthStart, end: monthEnd });
  });

  const monthlyIncome = transactions
    .filter(t => t.type === 'income' && isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd }))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const monthlyExpenses = transactions
    .filter(t => t.type === 'expense' && isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd }))
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const upcomingReservations = reservations
    .filter(r => ['pending', 'confirmed'].includes(r.status))
    .sort((a, b) => new Date(a.check_in) - new Date(b.check_in))
    .slice(0, 5);

  const todayCheckIns = reservations.filter(r => 
    isToday(parseISO(r.check_in)) && r.status !== 'cancelled'
  );

  const todayCheckOuts = reservations.filter(r => 
    isToday(parseISO(r.check_out)) && r.status === 'checked_in'
  );

  const bookingUrl = company?.slug ? `${window.location.origin}${createPageUrl('PublicBooking')}?c=${company.slug}` : '';

  const copyBookingUrl = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const syncAllCalendars = async () => {
    setSyncing(true);
    
    // Suprimir erros de rede globalmente
    const originalError = console.error;
    console.error = (...args) => {
      const str = String(args[0] || '');
      if (str.includes('Failed to fetch') || str.includes('NetworkError') || str.includes('CORS')) return;
      originalError(...args);
    };

    try {
      let totalCreated = 0;
      let errors = [];
      
      // Limpar bloqueios antigos
      const existingBlocks = await base44.entities.BlockedDate.filter({ 
        company_id: company.id,
        source: 'ical_import'
      });
      
      for (const block of existingBlocks) {
        await base44.entities.BlockedDate.delete(block.id);
      }

      // Função para buscar iCal com múltiplos proxies
      const fetchIcal = async (url) => {
        const proxies = [
          url, // Direto
          `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
          `https://corsproxy.io/?${encodeURIComponent(url)}`
        ];

        for (const proxyUrl of proxies) {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(proxyUrl, { 
              signal: controller.signal,
              mode: 'cors',
              cache: 'no-cache'
            }).catch(() => null);
            
            clearTimeout(timeout);
            
            if (response?.ok) {
              const text = await response.text().catch(() => '');
              if (text.includes('BEGIN:VCALENDAR')) {
                return text;
              }
            }
          } catch {}
        }
        return null;
      };

      // Parse iCal
      const parseIcal = (icalText) => {
        const events = [];
        const lines = icalText.split(/\r?\n/);
        let event = null;
        
        for (const line of lines) {
          const l = line.trim();
          
          if (l === 'BEGIN:VEVENT') {
            event = {};
          } else if (l === 'END:VEVENT' && event) {
            if (event.start && event.end) events.push(event);
            event = null;
          } else if (event) {
            const match = l.match(/^(DTSTART|DTEND)[^:]*:(\d{8})/);
            if (match) {
              const [, field, date] = match;
              const formatted = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
              if (field === 'DTSTART') event.start = formatted;
              if (field === 'DTEND') event.end = formatted;
            }
            if (l.startsWith('SUMMARY:')) {
              event.summary = l.substring(8);
            }
          }
        }
        return events;
      };

      // Sincronizar cada acomodação
      for (const acc of accommodations) {
        if (!acc.ical_urls?.length) continue;

        for (const ical of acc.ical_urls) {
          if (!ical.url) continue;

          const data = await fetchIcal(ical.url);
          
          if (!data) {
            errors.push(ical.name || 'Calendário');
            continue;
          }

          const events = parseIcal(data);
          
          for (const event of events) {
            try {
              // Ajustar end_date (iCal é exclusivo)
              const endDate = new Date(event.end);
              endDate.setDate(endDate.getDate() - 1);
              const end = endDate.toISOString().split('T')[0];
              
              if (new Date(event.start) <= new Date(end)) {
                await base44.entities.BlockedDate.create({
                  company_id: company.id,
                  accommodation_id: acc.id,
                  start_date: event.start,
                  end_date: end,
                  reason: `${ical.name}: ${event.summary || 'Reserva'}`,
                  source: 'ical_import'
                });
                totalCreated++;
              }
            } catch {}
          }
        }
      }

      await queryClient.invalidateQueries(['blockedDates']);
      await queryClient.invalidateQueries(['reservations']);

      if (totalCreated > 0) {
        toast.success(`${totalCreated} datas sincronizadas!`);
        setTimeout(() => window.location.reload(), 500);
      } else if (errors.length > 0) {
        toast.error(`Falha ao sincronizar alguns calendários`);
      } else {
        toast.info('Nenhuma data nova');
      }
    } catch (error) {
      toast.error('Erro na sincronização');
    } finally {
      console.error = originalError;
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{company.name}</h1>
            <p className="text-slate-500">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {bookingUrl && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-xs sm:text-sm text-slate-600 truncate max-w-[150px] sm:max-w-[200px]">{bookingUrl}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={copyBookingUrl}>
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </Button>
                <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="ghost" className="h-8 w-8">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            )}
            <Button
              variant="outline"
              onClick={syncAllCalendars}
              disabled={syncing}
              className="w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar iCal'}
            </Button>
            <Link to={createPageUrl('Reservations')} className="w-full sm:w-auto">
              <Button className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white w-full shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Nova Reserva
              </Button>
            </Link>
          </div>
        </div>

        {/* Today's Activity */}
        {(todayCheckIns.length > 0 || todayCheckOuts.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {todayCheckIns.length > 0 && (
              <Card className="border-l-4 border-l-[#2C5F5D] bg-gradient-to-r from-[#2C5F5D]/10 to-transparent">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="w-5 h-5 text-[#2C5F5D]" />
                    <div>
                      <p className="font-semibold text-[#2C5F5D]">Check-ins Hoje</p>
                      <p className="text-sm text-[#3A7A77]">
                        {todayCheckIns.map(r => r.guest_name).join(', ')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {todayCheckOuts.length > 0 && (
              <Card className="border-l-4 border-l-amber-500 bg-amber-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ArrowDownRight className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-800">Check-outs Hoje</p>
                      <p className="text-sm text-amber-600">
                        {todayCheckOuts.map(r => r.guest_name).join(', ')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Reservas do Mês"
            value={monthlyReservations.length}
            icon={CalendarDays}
          />
          <StatsCard
            title="Acomodações"
            value={accommodations.length}
            icon={Home}
          />
          <StatsCard
            title="Receita do Mês"
            value={`R$ ${monthlyIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={TrendingUp}
          />
          <StatsCard
            title="Lucro do Mês"
            value={`R$ ${(monthlyIncome - monthlyExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
          />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <CalendarGrid
              reservations={reservations}
              blockedDates={blockedDates}
            />
          </div>

          {/* Upcoming Reservations */}
          <div>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Próximas Reservas</CardTitle>
                  <Link to={createPageUrl('Reservations')}>
                    <Button variant="ghost" size="sm">Ver todas</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingReservations.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Nenhuma reserva pendente
                  </p>
                ) : (
                  upcomingReservations.map(reservation => (
                    <ReservationCard
                      key={reservation.id}
                      reservation={reservation}
                      accommodation={accommodations.find(a => a.id === reservation.accommodation_id)}
                      compact
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <CompanyGuard>
      {({ user, company }) => <DashboardContent user={user} company={company} />}
    </CompanyGuard>
  );
}