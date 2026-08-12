import { env } from '../../config/env.js';

const resendEmailsUrl = 'https://api.resend.com/emails';

export interface ContactMessageNotification {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: Date;
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]!);

export const sendContactMessageNotification = async (message: ContactMessageNotification) => {
  if (!env.RESEND_API_KEY || !env.SUPPORT_EMAIL) {
    throw new Error('Contact notification email is not configured');
  }

  const submittedAt = message.createdAt.toISOString();
  const adminUrl = `${env.FRONTEND_URL.replace(/\/+$/, '')}/admin/contact`;
  const text = [
    'A new contact message was stored in the Wahab Mobiles Admin Portal.',
    '',
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Subject: ${message.subject}`,
    `Submitted: ${submittedAt}`,
    `ContactMessage ID: ${message.id}`,
    '',
    message.message,
    '',
    `Admin Portal: ${adminUrl}`,
  ].join('\n');

  const html = `
    <p>A new contact message was stored in the Wahab Mobiles Admin Portal.</p>
    <dl>
      <dt><strong>Name</strong></dt><dd>${escapeHtml(message.name)}</dd>
      <dt><strong>Email</strong></dt><dd>${escapeHtml(message.email)}</dd>
      <dt><strong>Subject</strong></dt><dd>${escapeHtml(message.subject)}</dd>
      <dt><strong>Submitted</strong></dt><dd>${escapeHtml(submittedAt)}</dd>
      <dt><strong>ContactMessage ID</strong></dt><dd>${escapeHtml(message.id)}</dd>
    </dl>
    <p>${escapeHtml(message.message).replace(/\r?\n/g, '<br>')}</p>
    <p><a href="${escapeHtml(adminUrl)}">Open Contact Messages in the Admin Portal</a></p>
  `.trim();

  const response = await fetch(resendEmailsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `contact-message-${message.id}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [env.SUPPORT_EMAIL],
      reply_to: message.email,
      subject: 'New Wahab Mobiles contact message',
      text,
      html,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend contact notification failed with status ${response.status}`);
  }
};
