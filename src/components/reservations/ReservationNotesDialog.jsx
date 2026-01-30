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

export default function ReservationNotesDialog({ reservation, open, onOpenChange }) {
  const [guestName, setGuestName] = useState('');
  const [notes, setNotes] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (reservation) {
      setGuestName(reservation.guest_name || '');
      setNotes(reservation.notes || '');
    }
  }, [reservation]);

  const handleClose = () => {
    setGuestName('');
    setNotes('');
    onOpenChange(false);
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Reservation.update(reservation.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reservations']);
      toast.success('Anotações atualizadas com sucesso!');
      handleClose();
    },
    onError: (error) => {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar anotações');
    }
  });

  const handleSave = async () => {
    if (!reservation?.id) return;
    updateMutation.mutate({
      guest_name: guestName,
      notes: notes
    });
  };

  if (!reservation) return null;

  const isExternalReservation = reservation.source && reservation.source !== 'direct';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Detalhes da Reserva</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Nome do Hóspede</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Digite o nome do hóspede"
            />
            {isExternalReservation && (
              <p className="text-xs text-slate-500">
                Reserva de {reservation.source} - você pode atualizar o nome aqui
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anotações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione suas observações sobre esta reserva..."
              className="min-h-[120px]"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-xs text-slate-600">
            <div><strong>Check-in:</strong> {reservation.check_in}</div>
            <div><strong>Check-out:</strong> {reservation.check_out}</div>
            <div><strong>Origem:</strong> {reservation.source === 'direct' ? 'Reserva Direta' : reservation.source}</div>
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
            disabled={updateMutation.isPending || !reservation?.id}
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