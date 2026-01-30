import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { to, from_name, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return Response.json({ 
        error: 'Os campos "to", "subject" e "html" são obrigatórios' 
      }, { status: 400 });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ 
        error: 'RESEND_API_KEY não configurada' 
      }, { status: 500 });
    }

    // Enviar email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro Resend:', result);
      return Response.json({ 
        success: false,
        error: result.message || 'Erro ao enviar email' 
      }, { status: response.status });
    }

    return Response.json({ 
      success: true,
      id: result.id 
    });

  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return Response.json({ 
      success: false,
      error: error.message || 'Erro ao enviar email' 
    }, { status: 500 });
  }
});