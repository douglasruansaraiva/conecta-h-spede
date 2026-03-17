import { base44 } from "@/api/base44Client";
import { format } from "date-fns";

export async function sendReservationConfirmationEmail({
  guest_email,
  guest_name,
  accommodation_name,
  check_in,
  check_out,
  guests_count,
  total_amount,
  paid_amount,
  company_name,
  company_phone,
  company_email,
  check_in_time,
  check_out_time,
  payment_instructions
}) {
  if (!guest_email) return;
  guest_email = guest_email.toLowerCase().trim();

  const remaining = (total_amount || 0) - (paid_amount || 0);

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr + "T12:00:00"), "dd/MM/yyyy");
    } catch {
      return dateStr;
    }
  };

  const body = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #2C5F5D, #3A7A77); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">✅ Confirmação de Reserva</h1>
      <p style="color: #b2d8d8; margin: 8px 0 0;">${company_name || "Sua hospedagem"}</p>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 16px; color: #333;">Olá, <strong>${guest_name || "Hóspede"}</strong>!</p>
      <p style="color: #555;">Sua reserva foi registrada com sucesso. Veja os detalhes abaixo:</p>
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 16px; color: #2C5F5D; font-size: 16px;">📋 Detalhes da Reserva</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #777; width: 40%;">Acomodação</td><td style="color: #333; font-weight: bold;">${accommodation_name || ""}</td></tr>
          <tr><td style="padding: 6px 0; color: #777;">Check-in</td><td style="color: #333;">${formatDate(check_in)} <span style="color:#888;">a partir das ${check_in_time || "14:00"}</span></td></tr>
          <tr><td style="padding: 6px 0; color: #777;">Check-out</td><td style="color: #333;">${formatDate(check_out)} <span style="color:#888;">até às ${check_out_time || "12:00"}</span></td></tr>
          <tr><td style="padding: 6px 0; color: #777;">Hóspedes</td><td style="color: #333;">${guests_count || 1} pessoa(s)</td></tr>
        </table>
      </div>
      <div style="background: #f0faf9; border: 1px solid #b2d8d8; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="margin: 0 0 16px; color: #2C5F5D; font-size: 16px;">💳 Resumo Financeiro</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #777;">Total da reserva</td><td style="color: #333; font-weight: bold;">${formatCurrency(total_amount)}</td></tr>
          <tr><td style="padding: 6px 0; color: #777;">Valor pago</td><td style="color: #22c55e; font-weight: bold;">${formatCurrency(paid_amount)}</td></tr>
          ${remaining > 0 ? `<tr><td style="padding: 6px 0; color: #777;">Saldo restante</td><td style="color: #f59e0b; font-weight: bold;">${formatCurrency(remaining)}</td></tr>` : ""}
        </table>
      </div>
      ${payment_instructions ? `
      <div style="background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <h4 style="margin: 0 0 8px; color: #92400e; font-size: 14px;">💡 Instruções de Pagamento</h4>
        <p style="margin: 0; color: #78350f; font-size: 14px;">${payment_instructions}</p>
      </div>` : ""}
      ${(company_phone || company_email) ? `
      <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
        <p style="color: #777; font-size: 14px; margin: 0 0 8px;">Em caso de dúvidas, entre em contato:</p>
        ${company_phone ? `<p style="margin: 4px 0; font-size: 14px;">📞 ${company_phone}</p>` : ""}
        ${company_email ? `<p style="margin: 4px 0; font-size: 14px;">✉️ ${company_email}</p>` : ""}
      </div>` : ""}
    </div>
    <div style="background: #f8f9fa; padding: 16px; text-align: center;">
      <p style="color: #aaa; font-size: 12px; margin: 0;">Esperamos você em breve! 🏡 — ${company_name || "Sua hospedagem"}</p>
    </div>
  </div>
</body>
</html>`;

  const result = await base44.integrations.Core.SendEmail({
    to: guest_email,
    subject: `✅ Confirmação de Reserva - ${company_name || "Sua Hospedagem"}`,
    body
  });
  console.log("[SendEmail] resultado:", result);
}