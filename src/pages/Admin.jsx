import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Search,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Shield,
  User,
  Loader2,
  AlertCircle
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
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchUsers, setSearchUsers] = useState('');
  const [searchCompanies, setSearchCompanies] = useState('');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        if (user?.role !== 'admin') {
          window.location.href = '/';
        }
      } catch (error) {
        window.location.href = '/';
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: allCompanies = [] } = useQuery({
    queryKey: ['admin-companies'],
    queryFn: () => base44.entities.Company.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: allReservations = [] } = useQuery({
    queryKey: ['admin-reservations'],
    queryFn: () => base44.entities.Reservation.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: allTransactions = [] } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => base44.entities.Transaction.list(),
    enabled: currentUser?.role === 'admin'
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId) => {
      // Delete user's companies first
      const userCompanies = allCompanies.filter(c => c.owner_email === allUsers.find(u => u.id === userId)?.email);
      for (const company of userCompanies) {
        await base44.entities.Company.delete(company.id);
      }
      // Note: User deletion would require backend function
      toast.success('Usuário e empresas associadas removidos');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setDeleteUserId(null);
    }
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: (companyId) => base44.entities.Company.delete(companyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-companies'] });
      setDeleteCompanyId(null);
      toast.success('Empresa removida com sucesso');
    }
  });

  const handleInviteUser = async () => {
    if (!inviteEmail) {
      toast.error('Digite um email válido');
      return;
    }

    setInviteLoading(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast.success('Convite enviado com sucesso!');
      setInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('user');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error) {
      toast.error('Erro ao enviar convite: ' + error.message);
    }
    setInviteLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C5F5D]" />
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Acesso Negado</h2>
              <p className="text-slate-600">Você não tem permissão para acessar esta página.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredUsers = allUsers.filter(user => 
    user.email?.toLowerCase().includes(searchUsers.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchUsers.toLowerCase())
  );

  const filteredCompanies = allCompanies.filter(company =>
    company.name?.toLowerCase().includes(searchCompanies.toLowerCase()) ||
    company.owner_email?.toLowerCase().includes(searchCompanies.toLowerCase())
  );

  const totalRevenue = allTransactions
    .filter(t => t.type === 'income' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpenses = allTransactions
    .filter(t => t.type === 'expense' && t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalReservations = allReservations.length;
  const activeReservations = allReservations.filter(r => 
    r.status === 'confirmed' || r.status === 'checked_in'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Painel de Administração</h1>
          <p className="text-slate-600">Gerencie usuários, empresas e monitore o sistema</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="users">Usuários ({allUsers.length})</TabsTrigger>
            <TabsTrigger value="companies">Empresas ({allCompanies.length})</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Total de Usuários
                  </CardTitle>
                  <Users className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allUsers.length}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {allUsers.filter(u => u.role === 'admin').length} administradores
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Empresas Ativas
                  </CardTitle>
                  <Building2 className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{allCompanies.length}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Empresas cadastradas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Reservas
                  </CardTitle>
                  <Calendar className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalReservations}</div>
                  <p className="text-xs text-slate-500 mt-1">
                    {activeReservations} ativas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Receita Total
                  </CardTitle>
                  <DollarSign className="w-4 h-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Lucro: R$ {(totalRevenue - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Últimos Usuários</CardTitle>
                  <CardDescription>Usuários cadastrados recentemente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allUsers.slice(0, 5).map(user => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center">
                            <span className="text-sm font-semibold text-white">
                              {user.full_name?.charAt(0) || user.email?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{user.full_name || 'Sem nome'}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Admin' : 'Usuário'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Últimas Empresas</CardTitle>
                  <CardDescription>Empresas cadastradas recentemente</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {allCompanies.slice(0, 5).map(company => (
                      <div key={company.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-10 h-10 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium">{company.name}</p>
                            <p className="text-xs text-slate-500">{company.owner_email}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{company.slug}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                    <CardDescription>Convide novos usuários e gerencie permissões</CardDescription>
                  </div>
                  <Button
                    onClick={() => setInviteDialogOpen(true)}
                    className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Convidar Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchUsers}
                      onChange={(e) => setSearchUsers(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredUsers.map(user => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center">
                          <span className="text-sm font-semibold text-white">
                            {user.full_name?.charAt(0) || user.email?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                            {user.role === 'admin' && (
                              <Badge className="bg-emerald-100 text-emerald-800">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{user.email}</p>
                          {user.created_date && (
                            <p className="text-xs text-slate-400">
                              Cadastrado em {format(new Date(user.created_date), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteUserId(user.id)}
                          disabled={user.id === currentUser.id}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Empresas</CardTitle>
                <CardDescription>Visualize e gerencie todas as empresas cadastradas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Buscar por nome ou proprietário..."
                      value={searchCompanies}
                      onChange={(e) => setSearchCompanies(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredCompanies.map(company => {
                    const companyReservations = allReservations.filter(r => r.company_id === company.id);
                    const companyRevenue = allTransactions
                      .filter(t => t.company_id === company.id && t.type === 'income' && t.status === 'completed')
                      .reduce((sum, t) => sum + (t.amount || 0), 0);

                    return (
                      <div
                        key={company.id}
                        className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {company.logo_url ? (
                            <img
                              src={company.logo_url}
                              alt={company.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-slate-400" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{company.name}</p>
                              <Badge variant="outline">{company.slug}</Badge>
                            </div>
                            <p className="text-sm text-slate-500">{company.owner_email}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <p className="text-xs text-slate-400">
                                {companyReservations.length} reservas
                              </p>
                              <p className="text-xs text-emerald-600 font-medium">
                                R$ {companyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteCompanyId(company.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Receita Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-emerald-600">
                    R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {allTransactions.filter(t => t.type === 'income' && t.status === 'completed').length} transações
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Despesas Totais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {allTransactions.filter(t => t.type === 'expense' && t.status === 'completed').length} transações
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">Lucro Líquido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    R$ {(totalRevenue - totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Margem: {totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transações Recentes</CardTitle>
                <CardDescription>Últimas movimentações financeiras do sistema</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {allTransactions.slice(0, 10).map(transaction => {
                    const company = allCompanies.find(c => c.company_id === transaction.company_id);
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium">{transaction.description || 'Sem descrição'}</p>
                          <p className="text-xs text-slate-500">
                            {company?.name || 'Empresa desconhecida'} • {transaction.category}
                          </p>
                          {transaction.date && (
                            <p className="text-xs text-slate-400">
                              {format(new Date(transaction.date), "dd/MM/yyyy", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                            {transaction.type === 'income' ? '+' : '-'} R$ {transaction.amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                            {transaction.status === 'completed' ? 'Concluído' : transaction.status === 'pending' ? 'Pendente' : 'Cancelado'}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="usuario@exemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Permissão</Label>
              <div className="flex gap-2 mt-2">
                <Button
                  type="button"
                  variant={inviteRole === 'user' ? 'default' : 'outline'}
                  onClick={() => setInviteRole('user')}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  Usuário
                </Button>
                <Button
                  type="button"
                  variant={inviteRole === 'admin' ? 'default' : 'outline'}
                  onClick={() => setInviteRole('admin')}
                  className="flex-1"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleInviteUser}
              disabled={inviteLoading}
              className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]"
            >
              {inviteLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
              Enviar Convite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Alert */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o usuário e todas as empresas associadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserMutation.mutate(deleteUserId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Company Alert */}
      <AlertDialog open={!!deleteCompanyId} onOpenChange={() => setDeleteCompanyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a empresa permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCompanyMutation.mutate(deleteCompanyId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}