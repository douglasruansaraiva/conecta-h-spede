import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reservation_id, amount } = await req.json();

    if (!reservation_id || !amount) {
      return Response.json(
        { error: 'Parâmetros inválidos' },
        { status: 400 }
      );
    }

    // Atualizar reserva para confirmada e marcar como paga
    await base44.asServiceRole.entities.Reservation.update(reservation_id, {
      status: 'confirmed',
      paid_amount: amount
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    return Response.json(
      { error: 'Erro ao confirmar pagamento' },
      { status: 500 }
    );
  }
});