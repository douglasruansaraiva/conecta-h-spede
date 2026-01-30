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
        
        <div className="space-y-3 py-3">
          <div className="bg-slate-50 p-2 rounded-lg flex gap-4 text-xs text-slate-600">
            <div><strong>Check-in:</strong> {blockedDate.start_date}</div>
            <div><strong>Check-out:</strong> {blockedDate.end_date}</div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="guest-name" className="text-sm">Nome</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Nome do hóspede"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="guest-email" className="text-sm">Email</Label>
              <Input
                id="guest-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guest-phone" className="text-sm">Telefone</Label>
              <Input
                id="guest-phone"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações..."
              className="min-h-[60px] text-sm"
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