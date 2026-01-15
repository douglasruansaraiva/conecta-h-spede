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
      payment_instructions
    } = await req.json();

    if (!guest_email || !reservation_id) {
      return Response.json({ error: 'Email e ID da reserva são obrigatórios' }, { status: 400 });
    }

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

${payment_instructions ? `💳 INSTRUÇÕES DE PAGAMENTO:\n${payment_instructions}\n` : ''}

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