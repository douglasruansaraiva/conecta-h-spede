import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExternalReservationDialog({ blockedDate, open, onOpenChange }) {
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (blockedDate) {
      // Extrair nome do reason se existir
      const reasonParts = (blockedDate.reason || '').split(':');
      const existingName = reasonParts.length > 1 ? reasonParts[1].trim() : '';
      
      setGuestName(blockedDate.guest_name || existingName);
      setGuestEmail(blockedDate.guest_email || '');
      setGuestPhone(blockedDate.guest_phone || '');
      setNotes(blockedDate.notes || '');
    }
  }, [blockedDate]);

  const handleClose = () => {
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setNotes('');
    onOpenChange(false);
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.BlockedDate.update(blockedDate.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blockedDates']);
      toast.success('Informações atualizadas com sucesso!');
      handleClose();
    },
    onError: (error) => {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar informações');
    }
  });

  const handleSave = async () => {
    if (!blockedDate?.id) return;
    updateMutation.mutate({
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      notes: notes
    });
  };

  if (!blockedDate) return null;

  const getSourceLabel = () => {
    const reasonLower = (blockedDate.reason || '').toLowerCase();
    if (reasonLower.includes('airbnb')) return 'Airbnb';
    if (reasonLower.includes('booking')) return 'Booking';
    if (reasonLower.includes('vrbo')) return 'VRBO';
    return 'Plataforma externa';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Reserva de {getSourceLabel()}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-xs text-slate-600">
            <div><strong>Check-in:</strong> {blockedDate.start_date}</div>
            <div><strong>Check-out:</strong> {blockedDate.end_date}</div>
            <div><strong>Origem:</strong> {getSourceLabel()}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-name">Nome do Hóspede</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Digite o nome do hóspede"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-email">Email do Hóspede</Label>
            <Input
              id="guest-email"
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="guest-phone">Telefone do Hóspede</Label>
            <Input
              id="guest-phone"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre esta reserva..."
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={updateMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !blockedDate?.id}
            className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]"
          >
            {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}