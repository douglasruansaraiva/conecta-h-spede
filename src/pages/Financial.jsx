import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Plus, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Edit,
  Trash2,
  BarChart3,
  Home
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StatsCard from '@/components/dashboard/StatsCard';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import CompanyGuard from '@/components/auth/CompanyGuard';

const categoryLabels = {
  reservation: 'Reserva',
  extra_service: 'Serviço Extra',
  cleaning: 'Limpeza',
  maintenance: 'Manutenção',
  utilities: 'Utilidades',
  taxes: 'Impostos',
  supplies: 'Suprimentos',
  marketing: 'Marketing',
  salary: 'Salários',
  other: 'Outros'
};

const paymentMethodLabels = {
  pix: 'PIX',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  transfer: 'Transferência',
  other: 'Outro'
};

function FinancialContent({ user, company }) {
  const [activeTab, setActiveTab] = useState('transactions');
  const [typeFilter, setTypeFilter] = useState('all');
  const [reportPeriod, setReportPeriod] = useState('6months');
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'income',
    category: 'other',
    description: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    payment_method: 'pix',
    status: 'completed'
  });
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Transaction.filter({ company_id: company.id }, '-date');
    },
    enabled: !!company?.id
  });

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

  const { data: blockedDates = [] } = useQuery({
    queryKey: ['blocked-dates', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.BlockedDate.filter({ company_id: company.id, source: 'ical_import' });
    },
    enabled: !!company?.id
  });

  // Calculate stats
  const currentMonth = new Date();
  const lastMonth = subMonths(currentMonth, 1);

  const currentMonthStart = startOfMonth(currentMonth);
  const currentMonthEnd = endOfMonth(currentMonth);
  const lastMonthStart = startOfMonth(lastMonth);
  const lastMonthEnd = endOfMonth(lastMonth);

  const currentMonthTransactions = transactions.filter(t => 
    isWithinInterval(parseISO(t.date), { start: currentMonthStart, end: currentMonthEnd })
  );

  const lastMonthTransactions = transactions.filter(t => 
    isWithinInterval(parseISO(t.date), { start: lastMonthStart, end: lastMonthEnd })
  );

  const currentIncome = currentMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const currentExpenses = currentMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const lastIncome = lastMonthTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const lastExpenses = lastMonthTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const filteredTransactions = transactions.filter(t => 
    typeFilter === 'all' || t.type === typeFilter
  );

  // Reports data
  const reportMonths = [];
  const monthsCount = reportPeriod === '6months' ? 6 : 12;
  for (let i = monthsCount - 1; i >= 0; i--) {
    const month = subMonths(currentMonth, i);
    reportMonths.push(month);
  }

  const revenueByMonth = reportMonths.map(month => {
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

  const revenueByAccommodation = accommodations.map(acc => {
    const accReservations = reservations.filter(r => 
      r.accommodation_id === acc.id && r.status !== 'cancelled'
    );
    
    const revenue = accReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    
    return {
      name: acc.name,
      receita: revenue,
      reservas: accReservations.length
    };
  }).sort((a, b) => b.receita - a.receita);

  // Count reservations by source including external calendars
  const reservationsBySource = reservations
    .filter(r => r.status !== 'cancelled')
    .reduce((acc, r) => {
      const source = r.source || 'direct';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

  // Add blocked dates from external calendars
  blockedDates.forEach(block => {
    if (block.reason) {
      const reason = block.reason.toLowerCase();
      if (reason.includes('airbnb')) {
        reservationsBySource['airbnb'] = (reservationsBySource['airbnb'] || 0) + 1;
      } else if (reason.includes('booking')) {
        reservationsBySource['booking'] = (reservationsBySource['booking'] || 0) + 1;
      } else if (reason.includes('vrbo')) {
        reservationsBySource['vrbo'] = (reservationsBySource['vrbo'] || 0) + 1;
      } else {
        reservationsBySource['other'] = (reservationsBySource['other'] || 0) + 1;
      }
    }
  });

  const sourceLabels = {
    direct: 'Direta',
    airbnb: 'Airbnb',
    booking: 'Booking',
    vrbo: 'VRBO',
    other: 'Outros'
  };

  const sourceData = Object.entries(reservationsBySource).map(([key, value]) => ({
    name: sourceLabels[key] || key,
    value
  }));

  const totalRevenue = reservations
    .filter(r => r.status !== 'cancelled')
    .reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalReservations = reservations.filter(r => r.status !== 'cancelled').length + blockedDates.length;
  const avgReservationValue = totalReservations > 0 ? totalRevenue / totalReservations : 0;

  const COLORS = ['#2C5F5D', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

  // Chart data
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const month = subMonths(currentMonth, i);
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const monthTransactions = transactions.filter(t => 
      isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    );
    chartData.push({
      month: format(month, 'MMM', { locale: ptBR }),
      receita: monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0),
      despesa: monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0)
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...formData,
      company_id: company?.id,
      amount: parseFloat(formData.amount) || 0
    };

    if (editingTransaction) {
      await base44.entities.Transaction.update(editingTransaction.id, data);
    } else {
      await base44.entities.Transaction.create(data);
    }

    queryClient.invalidateQueries(['transactions']);
    setLoading(false);
    setFormOpen(false);
    setEditingTransaction(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: 'other',
      description: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      payment_method: 'pix',
      status: 'completed'
    });
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type || 'income',
      category: transaction.category || 'other',
      description: transaction.description || '',
      amount: transaction.amount || '',
      date: transaction.date || format(new Date(), 'yyyy-MM-dd'),
      payment_method: transaction.payment_method || 'pix',
      status: transaction.status || 'completed'
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await base44.entities.Transaction.delete(deleteConfirmId);
      queryClient.invalidateQueries(['transactions']);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Financeiro</h1>
            <p className="text-slate-500">Controle de receitas, despesas e relatórios</p>
          </div>
          {activeTab === 'transactions' && (
            <Button 
              onClick={() => {
                resetForm();
                setEditingTransaction(null);
                setFormOpen(true);
              }}
              className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white w-full sm:w-auto shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
          )}
          {activeTab === 'reports' && (
            <Select value={reportPeriod} onValueChange={setReportPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6months">Últimos 6 meses</SelectItem>
                <SelectItem value="12months">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="transactions">
              <DollarSign className="w-4 h-4 mr-2" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="reports">
              <BarChart3 className="w-4 h-4 mr-2" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6 mt-6">

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatsCard
                title="Receita do Mês"
                value={`R$ ${currentIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={TrendingUp}
                trend={lastIncome > 0 ? `${((currentIncome - lastIncome) / lastIncome * 100).toFixed(0)}% vs mês anterior` : undefined}
                trendUp={currentIncome >= lastIncome}
              />
              <StatsCard
                title="Despesas do Mês"
                value={`R$ ${currentExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={TrendingDown}
              />
              <StatsCard
                title="Lucro do Mês"
                value={`R$ ${(currentIncome - currentExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                icon={DollarSign}
              />
            </div>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Fluxo de Caixa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip 
                        formatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="receita" 
                        stackId="1" 
                        stroke="#10b981" 
                        fill="#d1fae5" 
                        name="Receita"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="despesa" 
                        stackId="2" 
                        stroke="#ef4444" 
                        fill="#fee2e2" 
                        name="Despesa"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Transactions */}
            <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transações</CardTitle>
              <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="income">Receitas</TabsTrigger>
                  <TabsTrigger value="expense">Despesas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Nenhuma transação</p>
              ) : (
                filteredTransactions.map(transaction => (
                  <div 
                    key={transaction.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        transaction.type === 'income' 
                          ? 'bg-emerald-100' 
                          : 'bg-red-100'
                      }`}>
                        {transaction.type === 'income' 
                          ? <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                          : <ArrowDownRight className="w-5 h-5 text-red-600" />
                        }
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {transaction.description || categoryLabels[transaction.category]}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-500">
                            {format(parseISO(transaction.date), 'dd/MM/yyyy')}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[transaction.category]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                      <span className={`font-semibold text-sm sm:text-base ${
                        transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        R$ {(transaction.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleEdit(transaction)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600"
                          onClick={() => setDeleteConfirmId(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6 mt-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-500">Receita Total</p>
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    R$ {(totalRevenue - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-slate-500">Ticket Médio</p>
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">
                    R$ {avgReservationValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sourceData.map((entry, index) => (
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da transação"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(paymentMethodLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingTransaction ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Financial() {
  return (
    <CompanyGuard>
      {({ user, company }) => <FinancialContent user={user} company={company} />}
    </CompanyGuard>
  );
}