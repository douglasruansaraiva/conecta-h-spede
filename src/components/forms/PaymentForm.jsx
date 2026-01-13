import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { base44 } from "@/api/base44Client";

export default function PaymentForm({ 
  open, 
  onClose, 
  reservation, 
  companyId,
  onSave 
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: 'pix',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const pendingAmount = reservation 
    ? (reservation.total_amount || 0) - (reservation.paid_amount || 0)
    : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const amount = parseFloat(formData.amount) || 0;

    // Create transaction
    await base44.entities.Transaction.create({
      company_id: companyId,
      reservation_id: reservation.id,
      type: 'income',
      category: 'reservation',
      description: `Pagamento - ${reservation.guest_name}`,
      amount,
      date: formData.date,
      payment_method: formData.payment_method,
      status: 'completed'
    });

    // Update reservation paid amount
    await base44.entities.Reservation.update(reservation.id, {
      paid_amount: (reservation.paid_amount || 0) + amount
    });

    setLoading(false);
    onSave();
    onClose();
    
    // Show success toast
    const { toast } = await import("sonner");
    toast.success('Pagamento registrado com sucesso!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>

        {reservation && (
          <div className="bg-slate-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-slate-600">Reserva: {reservation.guest_name}</p>
            <p className="text-sm text-slate-600">
              Total: R$ {(reservation.total_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-slate-600">
              Pago: R$ {(reservation.paid_amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm font-medium text-amber-600 mt-2">
              Pendente: R$ {pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Valor *</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
              required
            />
            {pendingAmount > 0 && (
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-xs text-emerald-600"
                onClick={() => setFormData({ ...formData, amount: pendingAmount })}
              >
                Preencher valor pendente
              </Button>
            )}
          </div>

          <div>
            <Label>Forma de Pagamento</Label>
            <Select 
              value={formData.payment_method} 
              onValueChange={(v) => setFormData({ ...formData, payment_method: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                <SelectItem value="cash">Dinheiro</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white shadow-md">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Registrar Pagamento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}