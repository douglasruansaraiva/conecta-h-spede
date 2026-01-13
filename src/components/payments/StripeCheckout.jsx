import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
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
        const response = await fetch('/api/confirmPayment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reservation_id: reservationId,
            amount: amount
          })
        });
        
        if (response.ok) {
          toast.success('Pagamento realizado com sucesso!');
          onSuccess();
        } else {
          toast.error('Pagamento processado, mas erro ao confirmar reserva');
          setLoading(false);
        }
      } catch (err) {
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
        const response = await fetch('/api/createPaymentIntent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            reservation_id: reservationId,
            company_id: companyId
          })
        });

        const data = await response.json();
        
        if (data.clientSecret && data.publishableKey) {
          setClientSecret(data.clientSecret);
          setStripePromise(loadStripe(data.publishableKey));
          setError(null);
        } else {
          const errorMsg = data.error || 'Erro ao inicializar pagamento';
          setError(errorMsg);
          toast.error(errorMsg);
        }
      } catch (error) {
        console.error('Erro:', error);
        toast.error('Erro ao conectar com sistema de pagamento');
        onCancel();
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onCancel} variant="outline">
          Voltar
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