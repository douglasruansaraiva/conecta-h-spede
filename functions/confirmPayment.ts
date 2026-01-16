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

        await base44.asServiceRole.functions.invoke('sendReservationConfirmation', {
          reservation_id: reservation.id,
          guest_email: reservation.guest_email,
          guest_name: reservation.guest_name,
          accommodation_name: accommodation.name,
          check_in: reservation.check_in,
          check_out: reservation.check_out,
          guests_count: reservation.guests_count || 1,
          total_amount: reservation.total_amount,
          paid_amount: newPaidAmount,
          remaining_amount: remainingAmount > 0 ? remainingAmount : 0,
          company_name: company.name,
          company_phone: company.phone,
          company_email: company.email,
          check_in_time: company.check_in_time,
          check_out_time: company.check_out_time,
          payment_instructions: company.payment_instructions,
          company_id: company.id
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