import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar,
  Home,
  Download,
  Loader2
} from "lucide-react";
import CompanyGuard from '@/components/auth/CompanyGuard';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

function ReportsContent({ user, company }) {
  const [period, setPeriod] = useState('6months'); // 6months, 12months, year

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

  // Calculate period dates
  const periodMonths = useMemo(() => {
    const monthsCount = period === '6months' ? 6 : 12;
    const endDate = new Date();
    const startDate = subMonths(endDate, monthsCount - 1);
    return eachMonthOfInterval({ start: startOfMonth(startDate), end: endOfMonth(endDate) });
  }, [period]);

  // Revenue by month
  const revenueByMonth = useMemo(() => {
    return periodMonths.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthReservations = reservations.filter(r => {
        const checkIn = parseISO(r.check_in);
        return r.status !== 'cancelled' && isWithinInterval(checkIn, { start: monthStart, end: monthEnd });
      });

      const revenue = monthReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      
      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        receita: revenue,
        reservas: monthReservations.length
      };
    });
  }, [periodMonths, reservations]);

  // Revenue by accommodation
  const revenueByAccommodation = useMemo(() => {
    return accommodations.map(acc => {
      const accReservations = reservations.filter(r => 
        r.accommodation_id === acc.id && r.status !== 'cancelled'
      );
      
      const revenue = accReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
      const nights = accReservations.length; // Simplified
      
      return {
        name: acc.name,
        receita: revenue,
        reservas: accReservations.length,
        ocupacao: nights
      };
    }).sort((a, b) => b.receita - a.receita);
  }, [accommodations, reservations]);

  // Reservations by source
  const reservationsBySource = useMemo(() => {
    const sources = reservations.reduce((acc, r) => {
      if (r.status === 'cancelled') return acc;
      const source = r.source || 'direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const sourceLabels = {
      direct: 'Direta',
      airbnb: 'Airbnb',
      booking: 'Booking',
      vrbo: 'VRBO',
      other: 'Outros'
    };

    return Object.entries(sources).map(([key, value]) => ({
      name: sourceLabels[key] || key,
      value
    }));
  }, [reservations]);

  // Summary stats
  const stats = useMemo(() => {
    const totalRevenue = reservations
      .filter(r => r.status !== 'cancelled')
      .reduce((sum, r) => sum + (r.total_amount || 0), 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalReservations = reservations.filter(r => r.status !== 'cancelled').length;
    const avgReservationValue = totalReservations > 0 ? totalRevenue / totalReservations : 0;

    return {
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      totalReservations,
      avgReservationValue
    };
  }, [reservations, transactions]);

  const COLORS = ['#2C5F5D', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Relatórios</h1>
            <p className="text-slate-500">Análise detalhada de desempenho</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="12months">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500">Receita Total</p>
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500">Despesas</p>
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                R$ {stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500">Lucro Líquido</p>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                R$ {stats.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500">Ticket Médio</p>
                <Calendar className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-slate-800">
                R$ {stats.avgReservationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue by Month */}
          <Card>
            <CardHeader>
              <CardTitle>Receita por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                  />
                  <Bar dataKey="receita" fill="#2C5F5D" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Reservations by Source */}
          <Card>
            <CardHeader>
              <CardTitle>Reservas por Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reservationsBySource}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {reservationsBySource.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Accommodation */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho por Acomodação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByAccommodation.map((acc, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center">
                      <Home className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">{acc.name}</h4>
                      <p className="text-sm text-slate-500">{acc.reservas} reservas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-800">
                      R$ {acc.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Reports() {
  return (
    <CompanyGuard>
      {({ user, company }) => <ReportsContent user={user} company={company} />}
    </CompanyGuard>
  );
}