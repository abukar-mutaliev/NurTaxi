/**
 * Промокоды и бонусный баланс (M6.7, feature-флаг региона).
 */
import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import {
  PROMO_FEATURE_FLAG,
  useGetPromoBalanceQuery,
  useRedeemPromoMutation,
} from '@nurtaxi/shared-core/entities/promo';
import { isFeatureEnabled, useGetRegionsQuery } from '@nurtaxi/shared-core/entities/region';

import { DEFAULT_REGION_ID, useOrderRegion } from '@/features/address';
import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassCard,
  GlassPrimaryButton,
  GlassScreenShell,
  GlassTextField,
} from '@/shared/ui';

export function PromoScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  useOrderRegion();

  const { data: regions, isLoading: regionsLoading } = useGetRegionsQuery();
  const region = regions?.find((item) => item.id === DEFAULT_REGION_ID) ?? regions?.[0];
  const promoEnabled = isFeatureEnabled(region, PROMO_FEATURE_FLAG);

  const {
    data: balance,
    isLoading,
    error,
    refetch,
  } = useGetPromoBalanceQuery(undefined, {
    skip: !promoEnabled,
  });
  const [redeemPromo, redeemState] = useRedeemPromoMutation();

  const [code, setCode] = useState('');
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<number | null>(null);

  if (regionsLoading) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  if (!promoEnabled) {
    return (
      <GlassScreenShell title={t('profile.promo')}>
        <Text style={{ color: GLASS_COLORS.subtitle, fontSize: scale * 15, textAlign: 'center' }}>
          {t('promo.unavailable')}
        </Text>
      </GlassScreenShell>
    );
  }

  if (isLoading) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  if (error) {
    return (
      <GlassScreenShell error={error} isError onRetry={refetch} retryLabel={t('common.retry')} />
    );
  }

  const submit = async () => {
    if (!region || code.trim().length < 3) {
      return;
    }
    setRedeemError(null);
    setRedeemSuccess(null);
    try {
      const result = await redeemPromo({ regionId: region.id, code: code.trim() }).unwrap();
      setRedeemSuccess(result.bonusAmount);
      setCode('');
    } catch (cause) {
      setRedeemError(toAppError(cause as never).message);
    }
  };

  return (
    <GlassScreenShell title={t('profile.promo')}>
      <GlassCard>
        <GlassCaption>{t('promo.balance')}</GlassCaption>
        <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 28, fontWeight: '600' }}>
          {formatMoney(balance?.balance ?? 0, balance?.currency ?? 'RUB')}
        </Text>
      </GlassCard>

      <View style={{ gap: scale * 12 }}>
        <GlassTextField
          autoCapitalize="characters"
          label={t('promo.codeLabel')}
          onChangeText={setCode}
          placeholder={t('promo.codePlaceholder')}
          scale={scale}
          value={code}
        />
        {redeemError ? (
          <Text style={{ color: GLASS_COLORS.error, fontSize: scale * 13, textAlign: 'center' }}>
            {redeemError}
          </Text>
        ) : null}
        {redeemSuccess != null ? (
          <Text style={{ color: GLASS_COLORS.success, fontSize: scale * 13, textAlign: 'center' }}>
            {t('promo.redeemed', {
              amount: formatMoney(redeemSuccess, balance?.currency ?? 'RUB'),
            })}
          </Text>
        ) : null}
        <GlassPrimaryButton
          disabled={code.trim().length < 3}
          loading={redeemState.isLoading}
          loadingTitle={t('common.loading')}
          onPress={submit}
          scale={scale}
          title={t('promo.redeem')}
        />
      </View>
    </GlassScreenShell>
  );
}
