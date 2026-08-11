import { env } from '../../config/env.js';

type Log = (details: object, message: string) => void;

const resendEmailsUrl = 'https://api.resend.com/emails';

export const sendPasswordResetEmail = async (email: string, resetUrl: string, log: Log) => {
  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV !== 'production') {
      log({ email, resetUrl }, 'local password reset email fallback');
      return;
    }
    throw new Error('Resend API key is not configured');
  }

  const response = await fetch(resendEmailsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [email],
      subject: 'Reset your password',
      text: `Use this link to reset your password. It expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes: ${resetUrl}`,
      html: `<p>Use the link below to reset your password. It expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend email send failed with status ${response.status}`);
  }
};
