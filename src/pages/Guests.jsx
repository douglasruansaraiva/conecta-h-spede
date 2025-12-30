import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, 
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Edit,
  Trash2,
  MoreHorizontal,
  Loader2,
  Eye,
  Star
} from "lucide-react";
import GuestDetailsModal from '@/components/guests/GuestDetailsModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import CompanyGuard from '@/components/auth/CompanyGuard';

function GuestsContent({ user, company }) {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detailsGuest, setDetailsGuest] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    address: '',
    city: '',
    state: '',
    country: 'Brasil',
    birth_date: '',
    notes: '',
    preferred_room_type: '',
    dietary_restrictions: '',
    special_requests: '',
    vip: false
  });
  const queryClient = useQueryClient();

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Guest.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const filteredGuests = guests.filter(g => 
    !search || 
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.email?.toLowerCase().includes(search.toLowerCase()) ||
    g.phone?.includes(search)
  );

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    setFormData({
      name: guest.name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      document: guest.document || '',
      address: guest.address || '',
      city: guest.city || '',
      state: guest.state || '',
      country: guest.country || 'Brasil',
      birth_date: guest.birth_date || '',
      notes: guest.notes || '',
      preferred_room_type: guest.preferred_room_type || '',
      dietary_restrictions: guest.dietary_restrictions || '',
      special_requests: guest.special_requests || '',
      vip: guest.vip || false
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await base44.entities.Guest.delete(deleteConfirmId);
      queryClient.invalidateQueries(['guests']);
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = { ...formData, company_id: company?.id };

    if (editingGuest) {
      await base44.entities.Guest.update(editingGuest.id, data);
    } else {
      await base44.entities.Guest.create(data);
    }

    queryClient.invalidateQueries(['guests']);
    setLoading(false);
    setFormOpen(false);
    setEditingGuest(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      document: '',
      address: '',
      city: '',
      state: '',
      country: 'Brasil',
      birth_date: '',
      notes: '',
      preferred_room_type: '',
      dietary_restrictions: '',
      special_requests: '',
      vip: false
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Hóspedes</h1>
            <p className="text-slate-500">Base de dados de hóspedes</p>
          </div>
          <Button 
            onClick={() => {
              setEditingGuest(null);
              setFormData({
                name: '',
                email: '',
                phone: '',
                document: '',
                address: '',
                city: '',
                state: '',
                country: 'Brasil',
                birth_date: '',
                notes: '',
                preferred_room_type: '',
                dietary_restrictions: '',
                special_requests: '',
                vip: false
              });
              setFormOpen(true);
            }}
            className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white w-full sm:w-auto shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Hóspede
          </Button>
        </div>

        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Grid */}
        {filteredGuests.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Nenhum hóspede</h3>
              <p className="text-slate-500">Os hóspedes serão cadastrados automaticamente nas reservas.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGuests.map(guest => (
              <Card key={guest.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2C5F5D] to-[#3A7A77] flex items-center justify-center shadow-sm">
                        <span className="text-lg font-bold text-white">
                          {guest.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-800">{guest.name}</h3>
                          {guest.vip && (
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        {guest.document && (
                          <p className="text-xs text-slate-400">{guest.document}</p>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailsGuest(guest)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(guest)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteConfirmId(guest.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-sm">
                    {guest.email && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{guest.email}</span>
                      </div>
                    )}
                    {guest.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone className="w-4 h-4 text-slate-400" />
                        <span>{guest.phone}</span>
                      </div>
                    )}
                    {(guest.city || guest.state) && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{[guest.city, guest.state].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Calendar className="w-4 h-4" />
                      <span>{guest.total_stays || 0} estadias</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <DollarSign className="w-4 h-4" />
                      <span>R$ {(guest.total_spent || 0).toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGuest ? 'Editar Hóspede' : 'Novo Hóspede'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>CPF/Documento</Label>
                <Input
                  value={formData.document}
                  onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                />
              </div>
              <div>
                <Label>Data de Nascimento</Label>
                <Input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Endereço</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div>
                <Label>Estado</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div>
                <Label>País</Label>
                <Input
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                />
              </div>
              </div>

              <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações gerais..."
                rows={2}
              />
              </div>

              <div className="border-t pt-4">
              <h4 className="font-medium text-slate-800 mb-3">Preferências</h4>
              <div className="space-y-4">
                <div>
                  <Label>Tipo de Acomodação Preferida</Label>
                  <Select 
                    value={formData.preferred_room_type} 
                    onValueChange={(v) => setFormData({ ...formData, preferred_room_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>Nenhuma</SelectItem>
                      <SelectItem value="quarto">Quarto</SelectItem>
                      <SelectItem value="suite">Suíte</SelectItem>
                      <SelectItem value="chale">Chalé</SelectItem>
                      <SelectItem value="apartamento">Apartamento</SelectItem>
                      <SelectItem value="casa">Casa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Restrições Alimentares</Label>
                  <Textarea
                    value={formData.dietary_restrictions}
                    onChange={(e) => setFormData({ ...formData, dietary_restrictions: e.target.value })}
                    placeholder="Ex: vegetariano, alergia a frutos do mar..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Pedidos Especiais</Label>
                  <Textarea
                    value={formData.special_requests}
                    onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                    placeholder="Ex: andar alto, vista para o mar..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="vip"
                    checked={formData.vip}
                    onCheckedChange={(checked) => setFormData({ ...formData, vip: checked })}
                  />
                  <Label htmlFor="vip" className="flex items-center gap-2 cursor-pointer">
                    <Star className="w-4 h-4 text-amber-500" />
                    Marcar como Hóspede VIP
                  </Label>
                </div>
              </div>
              </div>

              <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingGuest ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Hóspede</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este hóspede?
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

      {/* Guest Details Modal */}
      <GuestDetailsModal
        guest={detailsGuest}
        open={!!detailsGuest}
        onClose={() => setDetailsGuest(null)}
        companyId={company?.id}
      />
    </div>
  );
}

export default function Guests() {
  return (
    <CompanyGuard>
      {({ user, company }) => <GuestsContent user={user} company={company} />}
    </CompanyGuard>
  );
}