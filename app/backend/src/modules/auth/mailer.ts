import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

type Log = (details: object, message: string) => void;

export const sendPasswordResetEmail = async (email: string, resetUrl: string, log: Log) => {
  if (!env.SMTP_HOST || !env.SMTP_PORT) {
    if (env.NODE_ENV !== 'production') {
      log({ email, resetUrl }, 'local password reset email fallback');
      return;
    }
    throw new Error('SMTP is not configured');
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: email,
    subject: 'Reset your password',
    text: `Use this link to reset your password. It expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes: ${resetUrl}`,
    html: `<p>Use the link below to reset your password. It expires in ${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
};
