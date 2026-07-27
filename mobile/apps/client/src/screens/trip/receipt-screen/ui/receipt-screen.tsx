/**
 * Экран чека/квитанции (M6.3, `§8.13`, `§22`).
 */
import { useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { formatDateTime, formatMoney } from '@nurtaxi/shared-core/shared/lib';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import { useGetReceiptQuery } from '@nurtaxi/shared-core/entities/order';

import {
  GLASS_COLORS,
  GLASS_DESIGN_WIDTH,
  GlassCaption,
  GlassCard,
  GlassScreenShell,
} from '@/shared/ui';

export function ReceiptScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const scale = width / GLASS_DESIGN_WIDTH;
  const { id: orderId } = useLocalSearchParams<{ id: string }>();

  const {
    data: receipt,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetReceiptQuery(orderId ?? '', { skip: !orderId });

  if (!orderId) {
    return (
      <GlassScreenShell title={t('order.receipt')}>
        <Text style={{ color: GLASS_COLORS.error, textAlign: 'center' }}>
          {t('errors.NOT_FOUND')}
        </Text>
      </GlassScreenShell>
    );
  }

  if (isLoading) {
    return <GlassScreenShell isLoading loadingLabel={t('common.loading')} />;
  }

  if (isError || !receipt) {
    return (
      <GlassScreenShell error={error} isError onRetry={refetch} retryLabel={t('common.retry')} />
    );
  }

  return (
    <GlassScreenShell title={t('order.receipt')}>
      <GlassCard>
        <Text style={{ color: GLASS_COLORS.title, fontSize: scale * 15, fontWeight: '600' }}>
          {t('payment.receiptNumber', { number: receipt.receiptNumber })}
        </Text>
        <Text
          style={{
            color: GLASS_COLORS.title,
            fontSize: scale * 28,
            fontWeight: '600',
            paddingTop: scale * 8,
          }}
        >
          {formatMoney(receipt.amount, receipt.currency)}
        </Text>
        <GlassCaption>{formatDateTime(receipt.issuedAt)}</GlassCaption>
      </GlassCard>
    </GlassScreenShell>
  );
}
