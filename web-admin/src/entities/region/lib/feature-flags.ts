import type { TFunction } from 'i18next';

export const FEATURE_FLAGS = [
  'family_account',
  'promo_codes',
  'surge_pricing',
  'audio_recording',
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export function getFeatureFlagLabel(t: TFunction, key: string): string {
  return t(`regions.flags.${key}`, { defaultValue: key.replace(/_/g, ' ') });
}
