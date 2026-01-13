import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
      return await base44.entities.BlockedDate.filter({ company_id: company.id });
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
    console.log('=== INICIANDO SINCRONIZAÇÃO ===');
    console.log('Company:', company.name, company.id);
    console.log('Acomodações:', accommodations.length);
    
    try {
      let totalCreated = 0;
      let errors = [];
      
      // Delete existing ical blocks
      const existingBlocks = await base44.entities.BlockedDate.filter({ 
        company_id: company.id,
        source: 'ical_import'
      });
      
      console.log(`Deletando ${existingBlocks.length} bloqueios existentes...`);
      for (const block of existingBlocks) {
        await base44.entities.BlockedDate.delete(block.id);
      }

      // Sync each accommodation with iCal URLs
      for (const accommodation of accommodations) {
        console.log(`\n--- Acomodação: ${accommodation.name} ---`);
        
        if (!accommodation.ical_urls || accommodation.ical_urls.length === 0) {
          console.log('  Sem URLs iCal configuradas');
          continue;
        }

        console.log(`  ${accommodation.ical_urls.length} calendários para sincronizar`);

        for (const icalConfig of accommodation.ical_urls) {
          if (!icalConfig.url) continue;

          console.log(`\n  📅 Sincronizando: ${icalConfig.name}`);
          console.log(`     URL: ${icalConfig.url}`);

          let icalData = null;
          
          try {
            // Try direct fetch first
            const response = await fetch(icalConfig.url, { mode: 'cors' });
            if (response.ok) {
              icalData = await response.text();
              console.log('     ✓ Busca direta bem-sucedida');
            }
          } catch (directError) {
            console.log('     ⚠ Busca direta falhou, tentando proxy...');
            
            try {
              const proxyUrl = 'https://api.allorigins.win/raw?url=';
              const response = await fetch(proxyUrl + encodeURIComponent(icalConfig.url));
              if (response.ok) {
                icalData = await response.text();
                console.log('     ✓ Busca via proxy bem-sucedida');
              }
            } catch (proxyError) {
              console.error(`     ✗ Falha ao buscar ${icalConfig.name}:`, proxyError.message);
              errors.push(icalConfig.name || 'Calendário desconhecido');
              continue;
            }
          }
          
          if (!icalData) {
            console.log('     ✗ Nenhum dado retornado');
            errors.push(icalConfig.name || 'Calendário desconhecido');
            continue;
          }
          
          try {
            
            console.log(`     Parseando iCal... (${icalData.length} caracteres)`);
            const events = [];
            const lines = icalData.split(/\r?\n/);
            let currentEvent = null;
            
            for (const line of lines) {
              const trimmed = line.trim();
              
              if (trimmed === 'BEGIN:VEVENT') {
                currentEvent = {};
              } else if (trimmed === 'END:VEVENT' && currentEvent) {
                if (currentEvent.start && currentEvent.end) {
                  events.push(currentEvent);
                }
                currentEvent = null;
              } else if (currentEvent) {
                if (trimmed.startsWith('DTSTART')) {
                  // Suporta DTSTART:20240115 e DTSTART;VALUE=DATE:20240115 e DTSTART:20240115T140000Z
                  const match = trimmed.match(/DTSTART[^:]*:(\d{8})/);
                  if (match) {
                    const dateStr = match[1];
                    currentEvent.start = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
                  }
                } else if (trimmed.startsWith('DTEND')) {
                  // Suporta DTEND:20240117 e DTEND;VALUE=DATE:20240117 e DTEND:20240117T100000Z
                  const match = trimmed.match(/DTEND[^:]*:(\d{8})/);
                  if (match) {
                    const dateStr = match[1];
                    // IMPORTANTE: DTEND é exclusivo no padrão iCal, então subtraímos 1 dia
                    const endDate = new Date(
                      parseInt(dateStr.slice(0,4)),
                      parseInt(dateStr.slice(4,6)) - 1,
                      parseInt(dateStr.slice(6,8))
                    );
                    endDate.setDate(endDate.getDate() - 1);
                    const year = endDate.getFullYear();
                    const month = String(endDate.getMonth() + 1).padStart(2, '0');
                    const day = String(endDate.getDate()).padStart(2, '0');
                    currentEvent.end = `${year}-${month}-${day}`;
                    currentEvent.originalEnd = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
                  }
                } else if (trimmed.startsWith('SUMMARY')) {
                  const parts = trimmed.split(':');
                  currentEvent.summary = parts.slice(1).join(':').trim();
                }
              }
            }

            console.log(`     📊 ${events.length} eventos encontrados`);
            
            let createdForThisCalendar = 0;
            for (const event of events) {
              try {
                console.log(`        - ${event.start} até ${event.end} (original: ${event.originalEnd || event.end}): ${event.summary || 'Sem título'}`);
                await base44.entities.BlockedDate.create({
                  company_id: company.id,
                  accommodation_id: accommodation.id,
                  start_date: event.start,
                  end_date: event.end,
                  reason: `${icalConfig.name || 'Reserva externa'}: ${event.summary || ''}`,
                  source: 'ical_import'
                });
                createdForThisCalendar++;
                totalCreated++;
              } catch (err) {
                console.error('        ✗ Erro ao criar bloqueio:', err);
              }
            }
            console.log(`     ✓ ${createdForThisCalendar} bloqueios criados para ${icalConfig.name}`);
          } catch (error) {
            console.error(`     ✗ Erro ao sincronizar ${icalConfig.name}:`, error);
            errors.push(icalConfig.name || 'Calendário desconhecido');
          }
        }
      }

      console.log('\n=== SINCRONIZAÇÃO CONCLUÍDA ===');
      console.log(`Total de bloqueios criados: ${totalCreated}`);
      console.log(`Erros: ${errors.length}`);

      if (totalCreated > 0) {
        if (errors.length > 0) {
          toast.success(`${totalCreated} datas sincronizadas. Alguns calendários falharam: ${errors.join(', ')}`);
        } else {
          toast.success(`${totalCreated} datas sincronizadas com sucesso!`);
        }
        window.location.reload();
      } else if (errors.length > 0) {
        toast.error(`Falha ao sincronizar: ${errors.join(', ')}`);
      } else {
        toast.warning('Nenhuma data nova para sincronizar');
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast.error('Erro ao sincronizar calendários: ' + error.message);
    }
    setSyncing(false);
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