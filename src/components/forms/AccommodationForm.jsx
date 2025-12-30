import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X, Plus, Upload, Loader2, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const AMENITIES = [
  'WiFi', 'Ar Condicionado', 'TV', 'Frigobar', 'Cofre', 'Secador', 
  'Varanda', 'Vista Mar', 'Banheira', 'Cozinha', 'Churrasqueira', 'Piscina Privativa'
];

export default function AccommodationForm({ open, onClose, accommodation, companyId, onSave }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'quarto',
    description: '',
    max_guests: 2,
    base_price: '',
    weekend_price: '',
    min_nights: 1,
    amenities: [],
    images: [],
    ical_urls: [],
    status: 'active'
  });

  useEffect(() => {
    if (accommodation) {
      setFormData({
        name: accommodation.name || '',
        type: accommodation.type || 'quarto',
        description: accommodation.description || '',
        max_guests: accommodation.max_guests || 2,
        base_price: accommodation.base_price || '',
        weekend_price: accommodation.weekend_price || '',
        min_nights: accommodation.min_nights || 1,
        amenities: accommodation.amenities || [],
        images: accommodation.images || [],
        ical_urls: accommodation.ical_urls || [],
        status: accommodation.status || 'active'
      });
    } else {
      setFormData({
        name: '',
        type: 'quarto',
        description: '',
        max_guests: 2,
        base_price: '',
        weekend_price: '',
        min_nights: 1,
        amenities: [],
        images: [],
        ical_urls: [],
        status: 'active'
      });
    }
  }, [accommodation, open]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, file_url]
    }));
    setUploading(false);
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const addIcalUrl = () => {
    setFormData(prev => ({
      ...prev,
      ical_urls: [...prev.ical_urls, { name: '', url: '' }]
    }));
  };

  const removeIcalUrl = (index) => {
    setFormData(prev => ({
      ...prev,
      ical_urls: prev.ical_urls.filter((_, i) => i !== index)
    }));
  };

  const updateIcalUrl = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      ical_urls: prev.ical_urls.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const syncIcal = async () => {
    if (!formData.ical_urls || formData.ical_urls.length === 0) {
      toast.error('Adicione pelo menos uma URL de iCal primeiro');
      return;
    }
    
    if (!accommodation) {
      toast.error('Salve a acomodação primeiro antes de sincronizar');
      return;
    }
    
    setSyncing(true);
    try {
      // Delete existing ical blocks for this accommodation
      const existingBlocks = await base44.entities.BlockedDate.filter({ 
        company_id: companyId,
        accommodation_id: accommodation.id,
        source: 'ical_import'
      });
      
      for (const block of existingBlocks) {
        await base44.entities.BlockedDate.delete(block.id);
      }

      let totalCreated = 0;

      // Sync each iCal URL
      for (const icalConfig of formData.ical_urls) {
        if (!icalConfig.url) continue;

        try {
          const proxyUrl = 'https://corsproxy.io/?';
          const response = await fetch(proxyUrl + encodeURIComponent(icalConfig.url));
          
          if (!response.ok) {
            console.error(`Erro ao buscar ${icalConfig.name}:`, response.statusText);
            continue;
          }
          
          const icalData = await response.text();
          
          // Parse iCal data
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
                const match = trimmed.match(/DTSTART[^:]*:(\d{8})/);
                if (match) {
                  const dateStr = match[1];
                  currentEvent.start = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
                }
              } 
              else if (trimmed.startsWith('DTEND')) {
                const match = trimmed.match(/DTEND[^:]*:(\d{8})/);
                if (match) {
                  const dateStr = match[1];
                  currentEvent.end = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}`;
                }
              } 
              else if (trimmed.startsWith('SUMMARY')) {
                const parts = trimmed.split(':');
                currentEvent.summary = parts.slice(1).join(':').trim();
              }
            }
          }

          // Create blocks for this calendar
          for (const event of events) {
            try {
              await base44.entities.BlockedDate.create({
                company_id: companyId,
                accommodation_id: accommodation.id,
                start_date: event.start,
                end_date: event.end,
                reason: `${icalConfig.name || 'Reserva externa'}: ${event.summary || ''}`,
                source: 'ical_import'
              });
              totalCreated++;
            } catch (err) {
              console.error('Erro ao criar bloqueio:', err);
            }
          }
        } catch (error) {
          console.error(`Erro ao sincronizar ${icalConfig.name}:`, error);
        }
      }

      if (totalCreated > 0) {
        toast.success(`${totalCreated} datas bloqueadas importadas de ${formData.ical_urls.length} calendários!`);
        onSave();
      } else {
        toast.warning('Nenhum evento encontrado nos calendários');
      }
    } catch (error) {
      console.error('Erro ao sincronizar iCal:', error);
      toast.error('Erro ao sincronizar: ' + error.message);
    }
    setSyncing(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = {
      ...formData,
      company_id: companyId,
      base_price: parseFloat(formData.base_price) || 0,
      weekend_price: parseFloat(formData.weekend_price) || parseFloat(formData.base_price) || 0,
      max_guests: parseInt(formData.max_guests) || 2,
      min_nights: parseInt(formData.min_nights) || 1
    };

    if (accommodation) {
      await base44.entities.Accommodation.update(accommodation.id, data);
    } else {
      await base44.entities.Accommodation.create(data);
    }

    setLoading(false);
    onSave();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{accommodation ? 'Editar Acomodação' : 'Nova Acomodação'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Suíte Master"
                required
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarto">Quarto</SelectItem>
                  <SelectItem value="suite">Suíte</SelectItem>
                  <SelectItem value="chale">Chalé</SelectItem>
                  <SelectItem value="apartamento">Apartamento</SelectItem>
                  <SelectItem value="casa">Casa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva a acomodação..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Label>Preço (diária) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                placeholder="200.00"
                required
              />
            </div>
            <div>
              <Label>Preço (fim de semana)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.weekend_price}
                onChange={(e) => setFormData({ ...formData, weekend_price: e.target.value })}
                placeholder="250.00"
              />
            </div>
            <div>
              <Label>Máx. hóspedes</Label>
              <Input
                type="number"
                min="1"
                value={formData.max_guests}
                onChange={(e) => setFormData({ ...formData, max_guests: e.target.value })}
              />
            </div>
            <div>
              <Label>Mín. noites</Label>
              <Input
                type="number"
                min="1"
                value={formData.min_nights}
                onChange={(e) => setFormData({ ...formData, min_nights: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Comodidades</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(amenity => (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    formData.amenities.includes(amenity)
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  } border`}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-3 block">Imagens</Label>
            <div className="flex flex-wrap gap-3">
              {formData.images.map((img, i) => (
                <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden group">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-400 flex flex-col items-center justify-center cursor-pointer transition-colors">
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400" />
                    <span className="text-xs text-slate-500 mt-1">Upload</span>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>URLs iCal (Airbnb, Booking, VRBO, etc)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addIcalUrl}
              >
                <Plus className="w-4 h-4 mr-1" />
                Adicionar
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.ical_urls.map((ical, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={ical.name}
                    onChange={(e) => updateIcalUrl(index, 'name', e.target.value)}
                    placeholder="Nome (ex: Airbnb)"
                    className="w-32"
                  />
                  <Input
                    value={ical.url}
                    onChange={(e) => updateIcalUrl(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeIcalUrl(index)}
                  >
                    <X className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
              
              {formData.ical_urls.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={syncIcal}
                  disabled={syncing || !accommodation}
                  className="w-full"
                >
                  {syncing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sincronizando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sincronizar Todos os Calendários
                    </>
                  )}
                </Button>
              )}
            </div>
            
            <p className="text-xs text-slate-500 mt-2">
              Adicione múltiplas URLs de calendários iCal e sincronize todos de uma vez
            </p>
          </div>

          {accommodation && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <Label className="mb-2 block text-emerald-800">Exportar Calendário (para VRBO, Booking, etc)</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/api/exportCalendar?accommodation_id=${accommodation.id}&company_id=${companyId}`}
                  className="flex-1 text-xs bg-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/exportCalendar?accommodation_id=${accommodation.id}&company_id=${companyId}`);
                    toast.success('URL copiada!');
                  }}
                >
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-emerald-700 mt-2">
                Use essa URL para sincronizar este calendário em outras plataformas (Airbnb, Booking, VRBO, etc)
              </p>
            </div>
          )}

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="maintenance">Em Manutenção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {accommodation ? 'Salvar' : 'Criar Acomodação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}