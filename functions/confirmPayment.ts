import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reservation_id, amount, company_id } = await req.json();

    if (!reservation_id || !amount) {
      return Response.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    // Buscar reserva
    const reservations = await base44.asServiceRole.entities.Reservation.filter({ id: reservation_id });
    if (reservations.length === 0) {
      return Response.json({ error: 'Reserva não encontrada' }, { status: 404 });
    }
    const reservation = reservations[0];

    // Atualizar reserva para confirmada e marcar como paga
    const newPaidAmount = parseFloat(amount);
    await base44.asServiceRole.entities.Reservation.update(reservation_id, {
      status: 'confirmed',
      paid_amount: newPaidAmount
    });

    // Enviar email de confirmação
    try {
      const accommodations = await base44.asServiceRole.entities.Accommodation.filter({ 
        id: reservation.accommodation_id 
      });
      const companies = await base44.asServiceRole.entities.Company.filter({ 
        id: company_id || reservation.company_id 
      });

      if (accommodations.length > 0 && companies.length > 0 && reservation.guest_email) {
        const accommodation = accommodations[0];
        const company = companies[0];
        const remainingAmount = reservation.total_amount - newPaidAmount;

        const paymentLink = `${company.slug ? `https://app.conectahospede.com.br/Reservas?c=${company.slug}&reservation_id=${reservation.id}` : ''}`;

        const emailBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background: linear-gradient(135deg, #2C5F5D 0%, #3A7A77 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">✨ Reserva Confirmada!</h1>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">Olá <strong>${reservation.guest_name}</strong>,</p>
              
              <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Sua reserva em <strong>${company.name}</strong> foi confirmada com sucesso! 🎉
              </p>

              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #2C5F5D; margin-top: 0; font-size: 20px;">📋 Detalhes da Reserva</h2>
                <table style="width: 100%; color: #374151;">
                  <tr>
                    <td style="padding: 8px 0;"><strong>Acomodação:</strong></td>
                    <td style="padding: 8px 0;">${accommodation.name}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Check-in:</strong></td>
                    <td style="padding: 8px 0;">${reservation.check_in} às ${company.check_in_time || '14:00'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Check-out:</strong></td>
                    <td style="padding: 8px 0;">${reservation.check_out} às ${company.check_out_time || '12:00'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Hóspedes:</strong></td>
                    <td style="padding: 8px 0;">${reservation.guests_count || 1}</td>
                  </tr>
                </table>
              </div>

              <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #065f46; margin-top: 0; font-size: 18px;">💰 Informações de Pagamento</h3>
                <table style="width: 100%; color: #065f46;">
                  <tr>
                    <td style="padding: 8px 0;"><strong>Valor Total:</strong></td>
                    <td style="padding: 8px 0;">R$ ${reservation.total_amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;"><strong>Valor Pago:</strong></td>
                    <td style="padding: 8px 0;">R$ ${newPaidAmount.toFixed(2)}</td>
                  </tr>
                  ${remainingAmount > 0 ? `
                    <tr>
                      <td style="padding: 8px 0;"><strong>Saldo Restante:</strong></td>
                      <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">R$ ${remainingAmount.toFixed(2)}</td>
                    </tr>
                  ` : `
                    <tr>
                      <td colspan="2" style="padding: 8px 0; color: #10b981; font-weight: bold;">✅ Pagamento Integral Realizado</td>
                    </tr>
                  `}
                </table>

                ${remainingAmount > 0 && paymentLink ? `
                  <div style="margin-top: 15px; text-align: center;">
                    <a href="${paymentLink}" 
                       style="display: inline-block; background: linear-gradient(135deg, #2C5F5D 0%, #3A7A77 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                      💳 Pagar Saldo Restante
                    </a>
                  </div>
                ` : ''}
              </div>

              ${company.payment_instructions && remainingAmount > 0 ? `
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <p style="color: #92400e; margin: 0; font-size: 14px;"><strong>ℹ️ Instruções de Pagamento:</strong></p>
                  <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px; white-space: pre-line;">${company.payment_instructions}</p>
                </div>
              ` : ''}

              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
                <h3 style="color: #2C5F5D; font-size: 18px;">📞 Contato</h3>
                ${company.phone ? `<p style="color: #374151; margin: 8px 0;">📱 <strong>Telefone:</strong> ${company.phone}</p>` : ''}
                ${company.email ? `<p style="color: #374151; margin: 8px 0;">📧 <strong>Email:</strong> ${company.email}</p>` : ''}
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                Estamos ansiosos para recebê-lo(a)! 🌟
              </p>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
              <p>Esta é uma mensagem automática, por favor não responda.</p>
            </div>
          </div>
        `;

        await base44.asServiceRole.functions.invoke('sendEmailViaResend', {
          to: reservation.guest_email,
          from_name: company.name,
          subject: `Confirmação de Reserva - ${company.name}`,
          html: emailBody
        });
      }
    } catch (emailError) {
      console.error('Erro ao enviar email:', emailError);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    return Response.json(
      { error: 'Erro ao confirmar pagamento' },
      { status: 500 }
    );
  }
});