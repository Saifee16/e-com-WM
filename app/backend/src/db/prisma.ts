import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const DATABASE_CONNECT_RETRY_ATTEMPTS = 30;
const DATABASE_CONNECT_RETRY_DELAY_MS = 1_000;

const isDatabaseStarting = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('database system is starting up') || message.includes("can't reach database server") || message.includes('connection refused');
};

export const connectDatabase = async () => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DATABASE_CONNECT_RETRY_ATTEMPTS; attempt += 1) {
    try {
      await prisma.$connect();
      return;
    } catch (error) {
      lastError = error;
      if (!isDatabaseStarting(error) || attempt === DATABASE_CONNECT_RETRY_ATTEMPTS) {
        throw error;
      }

      console.warn(`Database is not ready; retrying connection (${attempt}/${DATABASE_CONNECT_RETRY_ATTEMPTS})...`);
      await new Promise((resolve) => setTimeout(resolve, DATABASE_CONNECT_RETRY_DELAY_MS));
    }
  }

  throw lastError;
};

export const disconnectDatabase = async () => {
  await prisma.$disconnect();
};
