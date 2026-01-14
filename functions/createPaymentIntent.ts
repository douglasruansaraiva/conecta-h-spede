import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { amount, reservation_id, company_id } = await req.json();

    if (!amount || !reservation_id || !company_id) {
      return Response.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    // Buscar chave do Stripe da empresa
    const companies = await base44.asServiceRole.entities.Company.filter({
      id: company_id
    });
    
    if (companies.length === 0) {
      return Response.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    const company = companies[0];
    
    console.log('🏢 Empresa:', company.name);
    console.log('🔑 Chaves configuradas:', {
      hasSecretKey: !!company.stripe_secret_key,
      hasPublishableKey: !!company.stripe_publishable_key
    });
    
    if (!company.stripe_secret_key || !company.stripe_publishable_key) {
      return Response.json(
        { error: 'Chaves do Stripe não configuradas. Configure em Configurações → Pagamentos.' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(company.stripe_secret_key, {
      apiVersion: '2023-10-16',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe usa centavos
      currency: 'brl',
      metadata: {
        reservation_id,
        company_id
      }
    });

    console.log('✅ Payment intent criado:', paymentIntent.id);

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: company.stripe_publishable_key
    });
  } catch (error) {
    console.error('❌ Erro ao criar payment intent:', error);
    return Response.json(
      { error: `Erro: ${error.message}` },
      { status: 500 }
    );
  }
});