import { createHash } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { fail } from '../../utils/responses.js';
import { consumeOAuthContext, issueOAuthContext } from './oauth-context.js';
import type { AuthRealm } from './tokens.js';

const googleUserSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  email_verified: z.boolean().optional(),
  given_name: z.string().optional(),
  family_name: z.string().optional(),
  name: z.string().optional(),
});

export type GoogleUser = z.infer<typeof googleUserSchema>;

const missingGoogleOAuthConfig = () => {
  const missing = [];

  if (!env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!env.GOOGLE_REDIRECT_URI) missing.push('GOOGLE_REDIRECT_URI');

  return missing;
};

export const getGoogleAuthUrl = (reply: FastifyReply, realm: AuthRealm) => {
  const missing = missingGoogleOAuthConfig();
  if (missing.length > 0) {
    fail(reply, 503, {
      code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      message: 'Google OAuth is not configured. Add the missing Google OAuth environment variables to backend/.env.',
      details: { missing },
    });
    return null;
  }

  const context = issueOAuthContext(reply, 'google', realm, true);
  const codeChallenge = createHash('sha256').update(context.codeVerifier!).digest('base64url');
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: env.GOOGLE_REDIRECT_URI!,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state: context.state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const exchangeGoogleUser = async (
  code: string,
  state: string,
  request: FastifyRequest,
  reply: FastifyReply,
  realm: AuthRealm,
): Promise<GoogleUser | null> => {
  const missing = missingGoogleOAuthConfig();
  if (missing.length > 0) {
    fail(reply, 503, {
      code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
      message: 'Google OAuth is not configured. Add the missing Google OAuth environment variables to backend/.env.',
      details: { missing },
    });
    return null;
  }

  const context = consumeOAuthContext(request, reply, 'google', realm, state);
  if (!context?.codeVerifier) return null;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: env.GOOGLE_REDIRECT_URI!,
      grant_type: 'authorization_code',
      code_verifier: context.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    fail(reply, 401, {
      code: 'GOOGLE_OAUTH_EXCHANGE_FAILED',
      message: 'Google OAuth code exchange failed',
    });
    return null;
  }

  const tokenJson = z.object({ access_token: z.string() }).parse(await tokenResponse.json());
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });

  if (!userResponse.ok) {
    fail(reply, 401, {
      code: 'GOOGLE_PROFILE_FAILED',
      message: 'Unable to load Google profile',
    });
    return null;
  }

  const googleUser = googleUserSchema.parse(await userResponse.json());

  if (googleUser.email_verified === false) {
    fail(reply, 401, {
      code: 'GOOGLE_EMAIL_NOT_VERIFIED',
      message: 'Google email must be verified',
    });
    return null;
  }

  return googleUser;
};
