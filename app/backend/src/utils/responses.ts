import type { FastifyReply } from 'fastify';

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export const ok = <T>(reply: FastifyReply, data: T, message?: string, meta?: Record<string, unknown>) => {
  return reply.send({
    success: true,
    data,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  });
};

export const fail = (reply: FastifyReply, statusCode: number, error: ApiErrorBody) => {
  return reply.status(statusCode).send({
    success: false,
    error,
  });
};
