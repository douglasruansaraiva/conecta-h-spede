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
    // Buscar chave do Stripe da empresa
    const company = await base44.asServiceRole.entities.Company.get(company_id);
    
    if (!company.stripe_secret_key) {
      return {
        status: 400,
        body: { error: 'Pagamentos online não configurados' }
      };
    }

    const stripe = require('stripe')(company.stripe_secret_key);

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
        clientSecret: paymentIntent.client_secret,
        publishableKey: company.stripe_publishable_key
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