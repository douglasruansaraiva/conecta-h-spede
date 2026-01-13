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
    
    console.log('🏢 Empresa:', company.name);
    console.log('🔑 Chaves configuradas:', {
      hasSecretKey: !!company.stripe_secret_key,
      hasPublishableKey: !!company.stripe_publishable_key
    });
    
    if (!company.stripe_secret_key || !company.stripe_publishable_key) {
      return {
        status: 400,
        body: { error: 'Chaves do Stripe não configuradas. Configure em Configurações → Pagamentos.' }
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

    console.log('✅ Payment intent criado:', paymentIntent.id);

    return {
      status: 200,
      body: {
        clientSecret: paymentIntent.client_secret,
        publishableKey: company.stripe_publishable_key
      }
    };
  } catch (error) {
    console.error('❌ Erro ao criar payment intent:', error);
    return {
      status: 500,
      body: { error: `Erro: ${error.message}` }
    };
  }
}