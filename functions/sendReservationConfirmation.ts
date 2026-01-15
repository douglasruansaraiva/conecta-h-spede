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

    const paymentLink = companySlug 
      ? `https://app.base44.com/app/${Deno.env.get("BASE44_APP_ID")}/Reservas?c=${companySlug}&reservation_id=${reservation_id}` 
      : '';

    const emailBody = `
Olá ${guest_name},

Sua reserva foi confirmada com sucesso!

📋 DETALHES DA RESERVA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Acomodação: ${accommodation_name}
Check-in: ${check_in} às ${check_in_time || '14:00'}
Check-out: ${check_out} às ${check_out_time || '12:00'}
Número de hóspedes: ${guests_count}
Valor total: R$ ${parseFloat(total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

${paymentLink ? `

💰 PAGAR RESERVA ONLINE:
${paymentLink}

Clique no link acima para realizar o pagamento da sua reserva.
` : ''}

${payment_instructions ? `💳 OUTRAS FORMAS DE PAGAMENTO:\n${payment_instructions}\n` : ''}

📞 CONTATO:
${company_phone ? `Telefone: ${company_phone}` : ''}
${company_email ? `Email: ${company_email}` : ''}

Aguardamos você!

Atenciosamente,
${company_name}
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