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
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BlockedDateNotesDialog({ blockedDate, open, onOpenChange }) {
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (blockedDate) {
      setReason(blockedDate.reason || '');
    }
  }, [blockedDate]);

  const handleClose = () => {
    setReason('');
    onOpenChange(false);
  };

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.BlockedDate.update(blockedDate.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['blockedDates']);
      toast.success('Anotações atualizadas com sucesso!');
      handleClose();
    },
    onError: (error) => {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar anotações');
    }
  });

  const handleSave = async () => {
    if (!blockedDate?.id) return;
    updateMutation.mutate({ reason });
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
          <DialogTitle>Editar Anotações do Período Bloqueado</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Anotações / Motivo do Bloqueio</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Adicione suas observações sobre este período bloqueado..."
              className="min-h-[120px]"
            />
            <p className="text-xs text-slate-500">
              Período bloqueado de {getSourceLabel()} - você pode adicionar notas adicionais
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg space-y-1 text-xs text-slate-600">
            <div><strong>Início:</strong> {blockedDate.start_date}</div>
            <div><strong>Fim:</strong> {blockedDate.end_date}</div>
            <div><strong>Origem:</strong> {blockedDate.source === 'ical_import' ? 'Importado via iCal' : 'Manual'}</div>
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