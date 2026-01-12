import { base44 } from '@base44/sdk';

export default async function createPaymentIntent(request) {
  const { amount, reservation_id, company_id } = request.body;

  if (!amount || !reservation_id || !company_id) {
    return {
      status: 400,
      body: { error: 'Parâmetros inválidos' }
    };
  }

  try {
    const stripe = require('stripe')(base44.secrets.STRIPE_SECRET_KEY);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centavos
      currency: 'brl',
      metadata: {
        reservation_id,
        company_id
      }
    });

    return {
      status: 200,
      body: {
        clientSecret: paymentIntent.client_secret
      }
    };
  } catch (error) {
    console.error('Erro ao criar payment intent:', error);
    return {
      status: 500,
      body: { error: 'Erro ao processar pagamento' }
    };
  }
}