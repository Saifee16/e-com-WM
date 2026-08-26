import { describe, expect, it } from 'vitest';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_NUMBERS,
  SHOP_ADDRESS,
  SHOP_MAPS_URL,
  SHOP_OPENING_HOURS,
  SHOP_WHATSAPP_URL,
} from './contact';

describe('authoritative public business data', () => {
  it('uses the owner-confirmed NAP, hours, Maps link, and WhatsApp number', () => {
    expect(CONTACT_PHONE_NUMBERS).toEqual([
      { label: '+92 312 2995584', href: 'tel:+923122995584' },
      { label: '+92 315 6914633', href: 'tel:+923156914633' },
    ]);
    expect(CONTACT_EMAIL).toBe('wahabmobiles@gmail.com');
    expect(SHOP_ADDRESS).toContain('Chandni Shopping Mall');
    expect(SHOP_ADDRESS).toContain('Hyderabad 71000');
    expect(SHOP_MAPS_URL).toBe('https://maps.app.goo.gl/sDRAiyBxtHMhD9Mb6');
    expect(SHOP_WHATSAPP_URL).toBe('https://wa.me/923122995584');
    expect(SHOP_OPENING_HOURS).toHaveLength(6);
  });

  it('does not expose the obsolete phone from active business config', () => {
    expect(JSON.stringify(CONTACT_PHONE_NUMBERS)).not.toContain('3483034922');
  });
});
