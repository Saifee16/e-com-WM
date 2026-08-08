import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { fail } from '../../utils/responses.js';
import { consumeOAuthContext, issueOAuthContext } from './oauth-context.js';
import type { AuthRealm } from './tokens.js';

const facebookUserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().transform((value) => value.toLowerCase()),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  name: z.string().optional(),
});

export type FacebookUser = z.infer<typeof facebookUserSchema>;

const missingFacebookOAuthConfig = () => {
  const missing = [];
  if (!env.FACEBOOK_APP_ID) missing.push('FACEBOOK_APP_ID');
  if (!env.FACEBOOK_APP_SECRET) missing.push('FACEBOOK_APP_SECRET');
  if (!env.FACEBOOK_REDIRECT_URI) missing.push('FACEBOOK_REDIRECT_URI');
  if (!env.FACEBOOK_GRAPH_API_VERSION) missing.push('FACEBOOK_GRAPH_API_VERSION');
  return missing;
};

export const getFacebookAuthUrl = (reply: FastifyReply, realm: AuthRealm) => {
  const missing = missingFacebookOAuthConfig();
  if (missing.length > 0) {
    fail(reply, 503, {
      code: 'FACEBOOK_OAUTH_NOT_CONFIGURED',
      message: 'Facebook Login is not configured.',
      details: { missing },
    });
    return null;
  }

  const context = issueOAuthContext(reply, 'facebook', realm);
  const params = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID!,
    redirect_uri: env.FACEBOOK_REDIRECT_URI!,
    response_type: 'code',
    scope: 'email,public_profile',
    state: context.state,
  });
  return `https://www.facebook.com/${env.FACEBOOK_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
};

export const exchangeFacebookUser = async (
  code: string,
  state: string,
  request: FastifyRequest,
  reply: FastifyReply,
  realm: AuthRealm,
): Promise<FacebookUser | null> => {
  const missing = missingFacebookOAuthConfig();
  if (missing.length > 0) {
    fail(reply, 503, {
      code: 'FACEBOOK_OAUTH_NOT_CONFIGURED',
      message: 'Facebook Login is not configured.',
      details: { missing },
    });
    return null;
  }

  if (!consumeOAuthContext(request, reply, 'facebook', realm, state)) return null;

  const tokenUrl = new URL(
    `https://graph.facebook.com/${env.FACEBOOK_GRAPH_API_VERSION}/oauth/access_token`,
  );
  tokenUrl.search = new URLSearchParams({
    client_id: env.FACEBOOK_APP_ID!,
    client_secret: env.FACEBOOK_APP_SECRET!,
    redirect_uri: env.FACEBOOK_REDIRECT_URI!,
    code,
  }).toString();
  const tokenResponse = await fetch(tokenUrl);
  if (!tokenResponse.ok) {
    fail(reply, 401, { code: 'FACEBOOK_OAUTH_EXCHANGE_FAILED', message: 'Facebook Login failed.' });
    return null;
  }

  const token = z.object({ access_token: z.string().min(1) }).parse(await tokenResponse.json());
  const profileUrl = new URL(`https://graph.facebook.com/${env.FACEBOOK_GRAPH_API_VERSION}/me`);
  profileUrl.searchParams.set('fields', 'id,name,email,first_name,last_name');
  const profileResponse = await fetch(profileUrl, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) {
    fail(reply, 401, { code: 'FACEBOOK_PROFILE_FAILED', message: 'Unable to load Facebook profile.' });
    return null;
  }

  const parsed = facebookUserSchema.safeParse(await profileResponse.json());
  if (!parsed.success) {
    fail(reply, 400, {
      code: 'FACEBOOK_EMAIL_REQUIRED',
      message: 'Facebook must share a valid email address to create or access this account.',
    });
    return null;
  }
  return parsed.data;
};
