import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { to, subject, html, fromName, fromEmail } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Faltan parámetros obligatorios (to, subject, html)' },
        { status: 400 }
      );
    }

    const smtpUser = process.env.SMTP_USER || fromEmail || 'raulruiz88@gmail.com';
    const smtpPass = process.env.SMTP_PASS || 'sidyghmqsnqgjscq';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass.replace(/\s+/g, ''),
      },
    });

    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Sin destinatarios válidos' }, { status: 400 });
    }

    const info = await transporter.sendMail({
      from: `"${fromName || 'MES Taller Lions'}" <${smtpUser}>`,
      to: recipients.join(', '),
      subject,
      html,
    });

    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error('Error enviando correo vía Gmail SMTP:', error);
    return NextResponse.json({ error: error?.message || 'Error al enviar correo' }, { status: 500 });
  }
}
