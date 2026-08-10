export const API_TAGS = {
  User: 'User',
  Region: 'Region',
  City: 'City',
  Tariff: 'Tariff',
  Provider: 'Provider',
  Staff: 'Staff',
  Driver: 'Driver',
  Order: 'Order',
  Analytics: 'Analytics',
  Complaint: 'Complaint',
  Audit: 'Audit',
} as const;

export type ApiTag = (typeof API_TAGS)[keyof typeof API_TAGS];
