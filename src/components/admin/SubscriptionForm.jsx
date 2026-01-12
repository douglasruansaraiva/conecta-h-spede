import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SubscriptionForm({ open, onClose, subscription, companies, onSave }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_id: '',
    plan: 'basic',
    monthly_fee: 100,
    status: 'active',
    due_date: '',
    paid_date: '',
    payment_status: 'pending',
    notes: ''
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        company_id: subscription.company_id || '',
        plan: subscription.plan || 'basic',
        monthly_fee: subscription.monthly_fee || 100,
        status: subscription.status || 'active',
        due_date: subscription.due_date || '',
        paid_date: subscription.paid_date || '',
        payment_status: subscription.payment_status || 'pending',
        notes: subscription.notes || ''
      });
    } else {
      setFormData({
        company_id: '',
        plan: 'basic',
        monthly_fee: 100,
        status: 'active',
        due_date: '',
        paid_date: '',
        payment_status: 'pending',
        notes: ''
      });
    }
  }, [subscription, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        monthly_fee: parseFloat(formData.monthly_fee)
      };

      if (subscription) {
        await base44.entities.Subscription.update(subscription.id, data);
        toast.success('Assinatura atualizada!');
      } else {
        await base44.entities.Subscription.create(data);
        toast.success('Assinatura criada!');
      }

      onSave();
      onClose();
    } catch (error) {
      toast.error('Erro ao salvar assinatura');
      console.error(error);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{subscription ? 'Editar Assinatura' : 'Nova Assinatura'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Empresa *</Label>
            <Select value={formData.company_id} onValueChange={(v) => setFormData({ ...formData, company_id: v })} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map(company => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Plano *</Label>
              <Select value={formData.plan} onValueChange={(v) => setFormData({ ...formData, plan: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor Mensal (R$) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.monthly_fee}
                onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="suspended">Suspenso</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status Pagamento</Label>
              <Select value={formData.payment_status} onValueChange={(v) => setFormData({ ...formData, payment_status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Vencimento *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Data Pagamento</Label>
              <Input
                type="date"
                value={formData.paid_date}
                onChange={(e) => setFormData({ ...formData, paid_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77]">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {subscription ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}