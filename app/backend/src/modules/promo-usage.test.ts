import { describe, expect, it } from 'vitest';
import { promoUsageWhere } from './promo-usage.js';

describe('promoUsageWhere', () => {
  it('scopes usage to the authenticated user or signed guest', () => {
    expect(promoUsageWhere({ userId: 'user-1' }, 'promo-1')).toMatchObject({ userId: 'user-1' });
    expect(promoUsageWhere({ guestId: 'guest-1' }, 'promo-1')).toMatchObject({ guestId: 'guest-1' });
  });
});
