import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { to, subject, html, fromName } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios (to, subject, html)' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY no configurada en las variables de entorno' },
        { status: 500 }
      );
    }

    const senderName = fromName || 'MES Taller Lions';
    const fromAddress = `${senderName} <onboarding@resend.dev>`;

    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Sin destinatarios válidos' }, { status: 400 });
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromAddress,
        to: recipients,
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error('Error enviando correo vía Resend:', resendData);
      return NextResponse.json({ error: resendData }, { status: resendRes.status });
    }

    return NextResponse.json({ success: true, data: resendData });
  } catch (error: any) {
    console.error('Error en /api/send-email:', error);
    return NextResponse.json({ error: error?.message || 'Error interno' }, { status: 500 });
  }
}
