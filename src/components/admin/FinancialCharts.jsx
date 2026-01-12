import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const COLORS = ['#2C5F5D', '#3A7A77', '#4A8A87', '#5A9A97', '#6AAAA7'];

export default function FinancialCharts({ subscriptions, expenses }) {
  // Dados mensais (últimos 12 meses)
  const monthlyData = React.useMemo(() => {
    const months = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      const monthRevenue = subscriptions
        .filter(s => {
          if (!s.paid_date || s.payment_status !== 'paid') return false;
          const paidDate = new Date(s.paid_date);
          return paidDate.getMonth() === date.getMonth() && 
                 paidDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, s) => sum + (s.monthly_fee || 0), 0);
      
      const monthExpenses = expenses
        .filter(e => {
          if (!e.date || e.status !== 'paid') return false;
          const expenseDate = new Date(e.date);
          return expenseDate.getMonth() === date.getMonth() && 
                 expenseDate.getFullYear() === date.getFullYear();
        })
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      months.push({
        month: monthStr,
        receitas: monthRevenue,
        despesas: monthExpenses,
        lucro: monthRevenue - monthExpenses
      });
    }
    
    return months;
  }, [subscriptions, expenses]);

  // Projeção anual
  const annualProjection = React.useMemo(() => {
    const currentMonth = new Date().getMonth();
    const avgMonthlyRevenue = monthlyData.slice(-3).reduce((sum, m) => sum + m.receitas, 0) / 3;
    const avgMonthlyExpenses = monthlyData.slice(-3).reduce((sum, m) => sum + m.despesas, 0) / 3;
    
    const projection = [];
    const today = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthStr = date.toLocaleDateString('pt-BR', { month: 'short' });
      const isPast = i === 0;
      
      projection.push({
        month: monthStr,
        projetado: isPast ? monthlyData[monthlyData.length - 1].receitas : avgMonthlyRevenue,
        tipo: isPast ? 'Real' : 'Projeção'
      });
    }
    
    return projection;
  }, [monthlyData]);

  // Distribuição de despesas por categoria
  const expensesByCategory = React.useMemo(() => {
    const categories = {};
    
    expenses
      .filter(e => e.status === 'paid')
      .forEach(expense => {
        const cat = expense.category || 'outros';
        categories[cat] = (categories[cat] || 0) + (expense.amount || 0);
      });
    
    return Object.entries(categories).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  }, [expenses]);

  // Taxa de crescimento
  const growthRate = React.useMemo(() => {
    if (monthlyData.length < 2) return 0;
    const lastMonth = monthlyData[monthlyData.length - 1].receitas;
    const previousMonth = monthlyData[monthlyData.length - 2].receitas;
    if (previousMonth === 0) return 0;
    return ((lastMonth - previousMonth) / previousMonth * 100).toFixed(1);
  }, [monthlyData]);

  const totalProjected = annualProjection.reduce((sum, m) => sum + m.projetado, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Receitas vs Despesas */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Receitas vs Despesas (Últimos 12 Meses)</CardTitle>
          <CardDescription>
            Comparativo mensal de entradas e saídas
            {growthRate !== 0 && (
              <span className={`ml-2 inline-flex items-center gap-1 ${parseFloat(growthRate) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {parseFloat(growthRate) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(growthRate)}% vs mês anterior
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Bar dataKey="receitas" fill="#10b981" name="Receitas" />
              <Bar dataKey="despesas" fill="#ef4444" name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Projeção Anual */}
      <Card>
        <CardHeader>
          <CardTitle>Projeção Anual de Receitas</CardTitle>
          <CardDescription>
            Estimativa baseada nos últimos 3 meses • Total: R$ {totalProjected.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={annualProjection}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="projetado" 
                stroke="#2C5F5D" 
                strokeWidth={2}
                name="Receita Projetada"
                dot={{ fill: '#2C5F5D' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição de Despesas */}
      <Card>
        <CardHeader>
          <CardTitle>Despesas por Categoria</CardTitle>
          <CardDescription>Distribuição dos custos operacionais</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={expensesByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {expensesByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Lucro Líquido Mensal */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Evolução do Lucro Líquido</CardTitle>
          <CardDescription>Lucro mensal (Receitas - Despesas)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip 
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="lucro" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Lucro Líquido"
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}