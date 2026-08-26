export const CONTACT_PHONE_NUMBERS = [
  { label: '+92 312 2995584', href: 'tel:+923122995584' },
  { label: '+92 315 6914633', href: 'tel:+923156914633' },
] as const;

export const BUSINESS_NAME = 'Wahab Mobiles';
export const CONTACT_EMAIL = 'wahabmobiles@gmail.com';
export const SHOP_ADDRESS = 'Shop #30, 2nd Corner, Ground Floor, Chandni Shopping Mall, opposite Soghat-e-Sheerin, Saddar Cantt, Hyderabad 71000, Sindh, Pakistan';
export const SHOP_LOCATION_LABEL = 'Saddar Cantt, Hyderabad';
export const SHOP_MAPS_URL = 'https://maps.app.goo.gl/sDRAiyBxtHMhD9Mb6';
export const SHOP_WHATSAPP_URL = 'https://wa.me/923122995584';

export const SHOP_STRUCTURED_ADDRESS = {
  streetAddress: 'Shop #30, 2nd Corner, Ground Floor, Chandni Shopping Mall, opposite Soghat-e-Sheerin, Saddar Cantt',
  addressLocality: 'Hyderabad',
  addressRegion: 'Sindh',
  postalCode: '71000',
  addressCountry: 'PK',
} as const;

export const SHOP_OPENING_HOURS = [
  { dayOfWeek: 'Monday', opens: '14:00', closes: '00:00' },
  { dayOfWeek: 'Tuesday', opens: '14:00', closes: '00:00' },
  { dayOfWeek: 'Wednesday', opens: '14:00', closes: '00:00' },
  { dayOfWeek: 'Thursday', opens: '14:00', closes: '00:00' },
  { dayOfWeek: 'Saturday', opens: '14:00', closes: '00:00' },
  { dayOfWeek: 'Sunday', opens: '14:00', closes: '00:00' },
] as const;

export const SOCIAL_PROFILE_URLS = [
  'https://www.facebook.com/profile.php?id=100063650661893',
  'https://www.instagram.com/mobileswahab',
  'https://www.youtube.com/@wahabmobiles662',
  'https://www.tiktok.com/@wahabmobilespak',
] as const;
