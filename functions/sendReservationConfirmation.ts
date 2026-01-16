import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      reservation_id,
      guest_email,
      guest_name,
      accommodation_name,
      check_in,
      check_out,
      guests_count,
      total_amount,
      paid_amount,
      remaining_amount,
      company_name,
      company_phone,
      company_email,
      check_in_time,
      check_out_time,
      payment_instructions,
      company_id
    } = await req.json();

    if (!guest_email || !reservation_id || !company_id) {
      return Response.json({ error: 'Email, ID da reserva e ID da empresa são obrigatórios' }, { status: 400 });
    }

    // Buscar slug da empresa para gerar link de pagamento
    const companies = await base44.asServiceRole.entities.Company.filter({ id: company_id });
    const company = companies[0];
    const companySlug = company?.slug;

    // Construir URL da página de reservas
    const appId = Deno.env.get("BASE44_APP_ID");
    const paymentLink = companySlug && appId
      ? `${req.headers.get('origin') || 'https://app.base44.com'}/Reservas?c=${companySlug}&reservation_id=${reservation_id}` 
      : '';

    const hasPaidAmount = paid_amount !== undefined && paid_amount !== null && paid_amount > 0;
    const hasRemainingAmount = remaining_amount !== undefined && remaining_amount !== null && remaining_amount > 0;

    const emailBody = `
Olá ${guest_name},

🎉 Bem-vindo(a) ao ${company_name}! 

Recebemos seu pagamento e sua reserva está confirmada!

💰 INFORMAÇÕES DE PAGAMENTO:

${hasPaidAmount ? `Valor pago: R$ ${parseFloat(paid_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}

${hasRemainingAmount ? `Valor restante a pagar na recepção: R$ ${parseFloat(remaining_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '✅ Pagamento quitado!'}

Estamos ansiosos para recebê-lo(a)!

Atenciosamente,
Equipe ${company_name}
    `.trim();

    await base44.integrations.Core.SendEmail({
      from_name: company_name,
      to: guest_email,
      subject: `Confirmação de Reserva - ${company_name}`,
      body: emailBody
    });

    return Response.json({ 
      success: true, 
      message: 'Email de confirmação enviado com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return Response.json({ 
      error: error.message || 'Erro ao enviar email'
    }, { status: 500 });
  }
});