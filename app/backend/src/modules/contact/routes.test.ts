import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  findMany: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  sendContactMessageNotification: vi.fn(),
}));

vi.mock('../../db/prisma.js', () => ({
  prisma: {
    contactMessage: {
      create: mocks.create,
      findMany: mocks.findMany,
    },
  },
}));
vi.mock('../auth/session.js', () => ({
  authenticateCustomer: vi.fn(),
  getAuthenticatedUser: mocks.getAuthenticatedUser,
}));
vi.mock('./mailer.js', () => ({
  sendContactMessageNotification: mocks.sendContactMessageNotification,
}));

import { contactRoutes } from './routes.js';

interface CapturedPostRoute {
  options: { config: { rateLimit: { max: number; timeWindow: string } } };
  handler: (request: Record<string, unknown>, reply: Record<string, unknown>) => Promise<unknown>;
}

const registerRoutes = async () => {
  let postRoute: CapturedPostRoute | undefined;
  const app = {
    post: vi.fn((_path, options, handler) => {
      postRoute = { options, handler };
    }),
    get: vi.fn(),
  };
  await contactRoutes(app as never, {});
  return postRoute!;
};

const makeReply = () => {
  const reply: Record<string, unknown> = {};
  reply.status = vi.fn(() => reply);
  reply.send = vi.fn((payload) => payload);
  return reply;
};

const validPayload = {
  name: 'Customer Name',
  email: 'Customer@Example.com',
  subject: 'Phone enquiry',
  message: 'Please confirm current availability.',
};

const storedMessage = {
  ...validPayload,
  email: 'customer@example.com',
  id: '6d11432f-0db4-4b64-a54a-971af63b4a17',
  status: 'OPEN',
  createdAt: new Date('2026-08-13T01:00:00.000Z'),
};

describe('contactRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUser.mockResolvedValue(null);
    mocks.create.mockResolvedValue(storedMessage);
    mocks.sendContactMessageNotification.mockResolvedValue(undefined);
  });

  it('persists a valid message before requesting its notification', async () => {
    const route = await registerRoutes();
    const reply = makeReply();
    const result = await route.handler({
      body: validPayload,
      log: { error: vi.fn() },
    }, reply);

    expect(mocks.create).toHaveBeenCalledWith({ data: { ...validPayload, email: 'customer@example.com' } });
    expect(mocks.sendContactMessageNotification).toHaveBeenCalledWith(storedMessage);
    expect(mocks.create.mock.invocationCallOrder[0]!).toBeLessThan(
      mocks.sendContactMessageNotification.mock.invocationCallOrder[0]!,
    );
    expect(reply.status).toHaveBeenCalledWith(201);
    expect(result).toMatchObject({ success: true, data: { id: storedMessage.id, status: 'OPEN' } });
  });

  it('returns the stored message when notification delivery fails', async () => {
    const route = await registerRoutes();
    const logError = vi.fn();
    mocks.sendContactMessageNotification.mockRejectedValue(new Error('provider unavailable'));

    const result = await route.handler({ body: validPayload, log: { error: logError } }, makeReply());

    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ success: true, data: { id: storedMessage.id } });
    expect(logError).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      'contact notification email failed',
    );
  });

  it.each([
    { ...validPayload, email: 'not-an-email' },
    { ...validPayload, message: '' },
  ])('rejects invalid contact payloads before persistence', async (payload) => {
    const route = await registerRoutes();
    await expect(route.handler({ body: payload, log: { error: vi.fn() } }, makeReply())).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendContactMessageNotification).not.toHaveBeenCalled();
  });

  it('retains the configured public-form rate limit', async () => {
    const route = await registerRoutes();
    expect(route.options.config.rateLimit).toEqual({ max: 10, timeWindow: '900 seconds' });
  });
});
