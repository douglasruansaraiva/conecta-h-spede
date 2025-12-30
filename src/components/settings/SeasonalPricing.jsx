import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Calendar, 
  Edit, 
  Trash2, 
  Loader2,
  DollarSign,
  TrendingUp
} from "lucide-react";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
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

export default function SeasonalPricing({ companyId, accommodations = [] }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    accommodation_id: '',
    name: '',
    start_date: '',
    end_date: '',
    price_multiplier: '',
    fixed_price: '',
    min_nights: '',
    allowed_checkin_days: [],
    allowed_checkout_days: [],
    active: true
  });

  const queryClient = useQueryClient();

  const { data: seasons = [] } = useQuery({
    queryKey: ['seasonal-prices', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return await base44.entities.SeasonalPrice.filter({ company_id: companyId });
    },
    enabled: !!companyId
  });

  const handleEdit = (season) => {
    setEditingSeason(season);
    setFormData({
      accommodation_id: season.accommodation_id || '',
      name: season.name || '',
      start_date: season.start_date || '',
      end_date: season.end_date || '',
      price_multiplier: season.price_multiplier || '',
      fixed_price: season.fixed_price || '',
      min_nights: season.min_nights || '',
      allowed_checkin_days: season.allowed_checkin_days || [],
      allowed_checkout_days: season.allowed_checkout_days || [],
      active: season.active !== false
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await base44.entities.SeasonalPrice.delete(deleteConfirmId);
      queryClient.invalidateQueries(['seasonal-prices']);
      setDeleteConfirmId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...formData,
      company_id: companyId,
      price_multiplier: formData.price_multiplier ? parseFloat(formData.price_multiplier) : null,
      fixed_price: formData.fixed_price ? parseFloat(formData.fixed_price) : null,
      min_nights: formData.min_nights ? parseInt(formData.min_nights) : null,
      accommodation_id: formData.accommodation_id || null
    };

    if (editingSeason) {
      await base44.entities.SeasonalPrice.update(editingSeason.id, data);
    } else {
      await base44.entities.SeasonalPrice.create(data);
    }

    queryClient.invalidateQueries(['seasonal-prices']);
    setLoading(false);
    setFormOpen(false);
    setEditingSeason(null);
    setFormData({
      accommodation_id: '',
      name: '',
      start_date: '',
      end_date: '',
      price_multiplier: '',
      fixed_price: '',
      min_nights: '',
      allowed_checkin_days: [],
      allowed_checkout_days: [],
      active: true
    });
  };

  const getAccommodationName = (accId) => {
    if (!accId) return 'Todas as acomodações';
    const acc = accommodations.find(a => a.id === accId);
    return acc?.name || 'N/A';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Preços Sazonais & Restrições</CardTitle>
          <Button 
            onClick={() => {
              setEditingSeason(null);
              setFormData({
                accommodation_id: '',
                name: '',
                start_date: '',
                end_date: '',
                price_multiplier: '',
                fixed_price: '',
                min_nights: '',
                allowed_checkin_days: [],
                allowed_checkout_days: [],
                active: true
              });
              setFormOpen(true);
            }}
            size="sm"
            className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Temporada
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {seasons.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhuma temporada configurada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {seasons.map(season => (
              <div key={season.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-800">{season.name}</h4>
                    {!season.active && <Badge variant="outline">Inativa</Badge>}
                  </div>
                  <p className="text-sm text-slate-600">
                    {getAccommodationName(season.accommodation_id)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(parseISO(season.start_date), "dd 'de' MMM", { locale: ptBR })} - {format(parseISO(season.end_date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                    {season.fixed_price && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        R$ {season.fixed_price.toFixed(2)}/noite
                      </span>
                    )}
                    {season.price_multiplier && !season.fixed_price && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {season.price_multiplier}x preço base
                      </span>
                    )}
                    {season.min_nights && (
                      <span>Mín: {season.min_nights} noites</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(season)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(season.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSeason ? 'Editar Temporada' : 'Nova Temporada'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Temporada *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Carnaval 2025, Réveillon, Alta Temporada"
                required
              />
            </div>

            <div>
              <Label>Aplicar a:</Label>
              <Select 
                value={formData.accommodation_id} 
                onValueChange={(v) => setFormData({ ...formData, accommodation_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as acomodações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todas as acomodações</SelectItem>
                  {accommodations.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início *</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Data de Fim *</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  min={formData.start_date}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-800 mb-3">Configuração de Preço</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Multiplicador de Preço</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.price_multiplier}
                    onChange={(e) => setFormData({ ...formData, price_multiplier: e.target.value, fixed_price: '' })}
                    placeholder="1.5 (50% mais caro)"
                  />
                  <p className="text-xs text-slate-500 mt-1">Multiplica o preço base</p>
                </div>
                <div>
                  <Label>OU Preço Fixo</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.fixed_price}
                    onChange={(e) => setFormData({ ...formData, fixed_price: e.target.value, price_multiplier: '' })}
                    placeholder="500.00"
                  />
                  <p className="text-xs text-slate-500 mt-1">Substitui o preço base</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-slate-800 mb-3">Restrições de Estadia</h4>
              <div className="mb-4">
                <Label>Mínimo de Noites</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.min_nights}
                  onChange={(e) => setFormData({ ...formData, min_nights: e.target.value })}
                  placeholder="Ex: 3"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block">Dias permitidos Check-in</Label>
                  <div className="space-y-2">
                    {[
                      { value: 0, label: 'Dom' },
                      { value: 1, label: 'Seg' },
                      { value: 2, label: 'Ter' },
                      { value: 3, label: 'Qua' },
                      { value: 4, label: 'Qui' },
                      { value: 5, label: 'Sex' },
                      { value: 6, label: 'Sáb' }
                    ].map(day => (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`ci-${day.value}`}
                          checked={formData.allowed_checkin_days.includes(day.value)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              allowed_checkin_days: checked
                                ? [...prev.allowed_checkin_days, day.value]
                                : prev.allowed_checkin_days.filter(d => d !== day.value)
                            }));
                          }}
                        />
                        <Label htmlFor={`ci-${day.value}`} className="text-sm cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Dias permitidos Check-out</Label>
                  <div className="space-y-2">
                    {[
                      { value: 0, label: 'Dom' },
                      { value: 1, label: 'Seg' },
                      { value: 2, label: 'Ter' },
                      { value: 3, label: 'Qua' },
                      { value: 4, label: 'Qui' },
                      { value: 5, label: 'Sex' },
                      { value: 6, label: 'Sáb' }
                    ].map(day => (
                      <div key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`co-${day.value}`}
                          checked={formData.allowed_checkout_days.includes(day.value)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              allowed_checkout_days: checked
                                ? [...prev.allowed_checkout_days, day.value]
                                : prev.allowed_checkout_days.filter(d => d !== day.value)
                            }));
                          }}
                        />
                        <Label htmlFor={`co-${day.value}`} className="text-sm cursor-pointer">
                          {day.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active" className="cursor-pointer">Temporada ativa</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]">
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingSeason ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Temporada</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta temporada?
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
    </Card>
  );
}