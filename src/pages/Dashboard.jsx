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
  Check
} from "lucide-react";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatsCard from '@/components/dashboard/StatsCard';
import ReservationCard from '@/components/reservations/ReservationCard';
import CalendarGrid from '@/components/reservations/CalendarGrid';
import CompanyGuard from '@/components/auth/CompanyGuard';

function DashboardContent({ user, company }) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{company.name}</h1>
            <p className="text-slate-500">
              {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {bookingUrl && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-600 truncate max-w-[200px]">{bookingUrl}</span>
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
            <Link to={createPageUrl('Reservations')}>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
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
              <Card className="border-l-4 border-l-emerald-500 bg-emerald-50/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-800">Check-ins Hoje</p>
                      <p className="text-sm text-emerald-600">
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