import { base44 } from '@base44/sdk';

export default async function confirmPayment(request) {
  const { reservation_id, amount } = request.body;

  if (!reservation_id || !amount) {
    return {
      status: 400,
      body: { error: 'Parâmetros inválidos' }
    };
  }

  try {
    // Atualizar reserva para confirmada e marcar como paga
    await base44.asServiceRole.entities.Reservation.update(reservation_id, {
      status: 'confirmed',
      paid_amount: amount
    });

    return {
      status: 200,
      body: { success: true }
    };
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    return {
      status: 500,
      body: { error: 'Erro ao confirmar pagamento' }
    };
  }
}