import type { Prisma } from '@prisma/client';

type PromoBuyer = { userId: string } | { guestId: string };

export const promoUsageWhere = (buyer: PromoBuyer, promoCodeId: string): Prisma.OrderWhereInput => ({
  ...buyer,
  promoCodeId,
  status: { notIn: ['CANCELLED', 'REFUNDED'] },
});
