import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { company_id } = body;

    if (!company_id) {
      return Response.json({ error: 'company_id é obrigatório' }, { status: 400 });
    }

    // Buscar todas as reservas com external_id (vieram do iCal)
    const allReservations = await base44.asServiceRole.entities.Reservation.filter({ 
      company_id 
    });

    const icalReservations = allReservations.filter(r => r.external_id);

    console.log(`Encontradas ${icalReservations.length} reservas do iCal`);

    let deletedCount = 0;
    let movedCount = 0;

    for (const reservation of icalReservations) {
      try {
        // Criar BlockedDate correspondente
        await base44.asServiceRole.entities.BlockedDate.create({
          company_id: reservation.company_id,
          accommodation_id: reservation.accommodation_id,
          start_date: reservation.check_in,
          end_date: reservation.check_out,
          reason: `${reservation.source}: ${reservation.guest_name || 'Reservado'}`,
          source: 'ical_import',
          guest_name: reservation.guest_name,
          guest_email: reservation.guest_email,
          guest_phone: reservation.guest_phone,
          notes: reservation.notes
        });

        // Deletar a reserva antiga
        await base44.asServiceRole.entities.Reservation.delete(reservation.id);

        movedCount++;
        console.log(`Movida reserva ${reservation.id} para BlockedDate`);
      } catch (error) {
        console.error(`Erro ao processar reserva ${reservation.id}:`, error);
        deletedCount++;
      }
    }

    return Response.json({
      success: true,
      message: `Limpeza concluída: ${movedCount} reservas movidas para bloqueios`,
      moved: movedCount,
      total: icalReservations.length
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});