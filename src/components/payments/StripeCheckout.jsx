import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, X } from "lucide-react";
import { toast } from "sonner";

function CheckoutForm({ amount, reservationId, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required'
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      // Pagamento confirmado - atualizar reserva
      try {
        const { base44 } = await import('@/api/base44Client');
        await base44.functions.invoke('confirmPayment', {
          reservation_id: reservationId,
          amount: amount,
          company_id: companyId
        });
        
        toast.success('Pagamento realizado com sucesso!');
        onSuccess();
      } catch (err) {
        console.error('Erro ao confirmar:', err);
        toast.error('Pagamento processado, mas erro ao confirmar reserva');
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-600">Total a pagar:</span>
          <span className="text-2xl font-bold text-slate-800">
            R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <PaymentElement />

      <div className="flex gap-3">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button 
          type="submit" 
          disabled={!stripe || loading}
          className="flex-1 bg-gradient-to-r from-[#2C5F5D] to-[#3A7A77] hover:from-[#234B49] hover:to-[#2C5F5D] text-white"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar Agora
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function StripeCheckout({ amount, reservationId, companyId, onSuccess, onCancel }) {
  const [error, setError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const createIntent = async () => {
      try {
        console.log('🔄 Criando payment intent...', { amount, reservationId, companyId });
        
        const { base44 } = await import('@/api/base44Client');
        const response = await base44.functions.invoke('createPaymentIntent', {
          amount,
          reservation_id: reservationId,
          company_id: companyId
        });

        console.log('📦 Resposta:', response.data);
        
        if (response.data.clientSecret && response.data.publishableKey) {
          setClientSecret(response.data.clientSecret);
          setStripePromise(loadStripe(response.data.publishableKey));
          setError(null);
        } else {
          const errorMsg = response.data.error || 'Erro ao inicializar pagamento';
          console.error('❌ Erro:', errorMsg);
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (error) {
        console.error('❌ Erro ao conectar:', error);
        const errorMsg = 'Erro ao conectar com sistema de pagamento. Verifique se as chaves do Stripe estão configuradas.';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    if (amount && reservationId && companyId) {
      createIntent();
    }
  }, [amount, reservationId, companyId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-600 text-sm">Carregando checkout...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          <X className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium mb-2">Pagamento Online Indisponível</p>
          <p className="text-slate-600 text-sm">{error}</p>
        </div>
        <Button onClick={onCancel} variant="outline">
          Voltar e escolher Pagar Depois
        </Button>
      </div>
    );
  }

  if (!clientSecret || !stripePromise) {
    return null;
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm amount={amount} reservationId={reservationId} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}