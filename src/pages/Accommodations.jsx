import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Home, 
  Users, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Wifi,
  Wind,
  Tv,
  UtensilsCrossed,
  Car,
  Waves
} from "lucide-react";
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
import AccommodationForm from '@/components/forms/AccommodationForm';
import CompanyGuard from '@/components/auth/CompanyGuard';

const typeLabels = {
  quarto: 'Quarto',
  suite: 'Suíte',
  chale: 'Chalé',
  apartamento: 'Apartamento',
  casa: 'Casa'
};

const statusColors = {
  active: 'bg-emerald-100 text-emerald-800',
  inactive: 'bg-slate-100 text-slate-800',
  maintenance: 'bg-amber-100 text-amber-800'
};

const statusLabels = {
  active: 'Ativo',
  inactive: 'Inativo',
  maintenance: 'Em Manutenção'
};

const amenityIcons = {
  'WiFi': Wifi,
  'Ar Condicionado': Wind,
  'TV': Tv,
  'Cozinha': UtensilsCrossed,
  'Estacionamento': Car,
  'Piscina': Waves
};

function AccommodationsContent({ user, company }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccommodation, setEditingAccommodation] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const queryClient = useQueryClient();

  const { data: accommodations = [], isLoading } = useQuery({
    queryKey: ['accommodations', company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      return await base44.entities.Accommodation.filter({ company_id: company.id });
    },
    enabled: !!company?.id
  });

  const handleEdit = (acc) => {
    setEditingAccommodation(acc);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await base44.entities.Accommodation.delete(deleteConfirmId);
      queryClient.invalidateQueries(['accommodations']);
      setDeleteConfirmId(null);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingAccommodation(null);
  };

  const handleFormSave = () => {
    queryClient.invalidateQueries(['accommodations']);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Acomodações</h1>
            <p className="text-slate-500">Gerencie seus quartos, suítes e chalés</p>
          </div>
          <Button 
            onClick={() => setFormOpen(true)}
            className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white w-full sm:w-auto shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Acomodação
          </Button>
        </div>

        {/* Grid */}
        {accommodations.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Nenhuma acomodação</h3>
              <p className="text-slate-500 mb-4">Cadastre suas acomodações para começar a receber reservas.</p>
              <Button onClick={() => setFormOpen(true)} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Acomodação
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accommodations.map(acc => (
              <Card key={acc.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                {/* Image */}
                <div className="aspect-video relative bg-slate-100">
                  {acc.images?.[0] ? (
                    <img 
                      src={acc.images[0]} 
                      alt={acc.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-12 h-12 text-slate-300" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <Badge className={statusColors[acc.status]}>
                      {statusLabels[acc.status]}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="absolute top-3 right-3 h-8 w-8 bg-white/90 hover:bg-white"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(acc)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteConfirmId(acc.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Content */}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800">{acc.name}</h3>
                      <p className="text-sm text-slate-500">{typeLabels[acc.type]}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#2C5F5D]">
                        R$ {acc.base_price?.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400">por noite</p>
                    </div>
                  </div>

                  {acc.description && (
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{acc.description}</p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-sm text-slate-600">
                      <Users className="w-4 h-4" />
                      <span>Até {acc.max_guests} hóspedes</span>
                    </div>
                    {acc.amenities?.length > 0 && (
                      <div className="flex items-center gap-1">
                        {acc.amenities.slice(0, 3).map(amenity => {
                          const Icon = amenityIcons[amenity] || Wifi;
                          return (
                            <div 
                              key={amenity} 
                              className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center"
                              title={amenity}
                            >
                              <Icon className="w-3 h-3 text-slate-500" />
                            </div>
                          );
                        })}
                        {acc.amenities.length > 3 && (
                          <span className="text-xs text-slate-400">+{acc.amenities.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <AccommodationForm
        open={formOpen}
        onClose={handleFormClose}
        accommodation={editingAccommodation}
        companyId={company?.id}
        onSave={handleFormSave}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Acomodação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta acomodação? Esta ação não pode ser desfeita.
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

export default function Accommodations() {
  return (
    <CompanyGuard>
      {({ user, company }) => <AccommodationsContent user={user} company={company} />}
    </CompanyGuard>
  );
}