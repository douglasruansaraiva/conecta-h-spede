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

    // Normalizar email para minúsculas e remover espaços
    const normalizedEmail = guest_email.toLowerCase().trim();
    console.log('Email original:', guest_email);
    console.log('Email normalizado:', normalizedEmail);

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

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2C5F5D 0%, #3A7A77 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .info-box { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2C5F5D; }
    .amount { font-size: 18px; font-weight: bold; color: #2C5F5D; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎉 Reserva Confirmada!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.95;">Bem-vindo(a) ao ${company_name}</p>
    </div>
    <div class="content">
      <p>Olá <strong>${guest_name}</strong>,</p>
      <p>Recebemos seu pagamento e sua reserva está confirmada!</p>
      
      <div class="info-box">
        <h3 style="margin-top: 0; color: #2C5F5D;">💰 Informações de Pagamento</h3>
        ${hasPaidAmount ? `<p class="amount">Valor pago: R$ ${parseFloat(paid_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>` : ''}
        ${hasRemainingAmount ? `<p class="amount" style="color: #d97706;">Valor restante a pagar na recepção: R$ ${parseFloat(remaining_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>` : '<p style="color: #059669;">✅ Pagamento quitado!</p>'}
      </div>

      <div class="info-box">
        <h3 style="margin-top: 0; color: #2C5F5D;">📅 Detalhes da Reserva</h3>
        <p><strong>Acomodação:</strong> ${accommodation_name}</p>
        <p><strong>Check-in:</strong> ${check_in} às ${check_in_time}</p>
        <p><strong>Check-out:</strong> ${check_out} às ${check_out_time}</p>
        <p><strong>Hóspedes:</strong> ${guests_count || 1} pessoa(s)</p>
      </div>

      ${payment_instructions ? `
      <div class="info-box">
        <h3 style="margin-top: 0; color: #2C5F5D;">ℹ️ Instruções</h3>
        <p>${payment_instructions}</p>
      </div>
      ` : ''}

      ${paymentLink ? `
      <p style="text-align: center; margin: 25px 0;">
        <a href="${paymentLink}" style="display: inline-block; background: #2C5F5D; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Minha Reserva</a>
      </p>
      ` : ''}

      <p>Estamos ansiosos para recebê-lo(a)!</p>
      <p style="margin-top: 30px;">Atenciosamente,<br><strong>Equipe ${company_name}</strong></p>
      ${company_phone ? `<p style="color: #6b7280; font-size: 14px;">📞 ${company_phone}</p>` : ''}
      ${company_email ? `<p style="color: #6b7280; font-size: 14px;">✉️ ${company_email}</p>` : ''}
    </div>
    <div class="footer">
      <p>Este é um e-mail automático de confirmação de reserva.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    console.log('Tentando enviar email para:', normalizedEmail);
    console.log('Assunto:', `✅ Confirmação de Reserva - ${company_name}`);
    
    const result = await base44.integrations.Core.SendEmail({
      from_name: company_name,
      to: normalizedEmail,
      subject: `✅ Confirmação de Reserva - ${company_name}`,
      body: emailHtml
    });

    console.log('✅ Email enviado com sucesso para:', normalizedEmail);
    console.log('Resultado da API:', JSON.stringify(result));

    return Response.json({ 
      success: true, 
      message: 'Email de confirmação enviado com sucesso' 
    });

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    console.error('Detalhes do erro:', JSON.stringify(error));
    console.error('Stack trace:', error.stack);
    return Response.json({ 
      error: error.message || 'Erro ao enviar email',
      details: error.toString()
    }, { status: 500 });
  }
});