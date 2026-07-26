/** Теги кэша RTK Query. Единый список нужен, чтобы инвалидация работала между слайсами. */
export const API_TAGS = [
  'Session',
  'Profile',
  'SavedAddress',
  'EmergencyContact',
  'FamilyMember',
  'PromoBalance',
  'Notification',
  'Region',
  'City',
  'Order',
  'OrderHistory',
  'Receipt',
  'Review',
  'DriverProfile',
  'DriverEarnings',
  'Payout',
] as const;

export type ApiTag = (typeof API_TAGS)[number];
