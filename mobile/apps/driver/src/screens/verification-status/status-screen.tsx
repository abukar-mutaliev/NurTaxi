/**
 * Статус верификации водителя (M7.3).
 *
 * У нового пользователя профиля водителя ещё нет — бэкенд отвечает 403/404 на
 * `GET /driver/profile`, пока роль не Driver. Это нормальное состояние («анкета не подана»),
 * поэтому экран ведёт на анкету, а не показывает бесконечную загрузку.
 */
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Loader, Text } from '@nurtaxi/shared-core/shared/ui';
import { useGetDriverProfileQuery } from '@nurtaxi/shared-core/entities/driver';

import { GlowIcon } from '@/shared/ui/glow-icon';
import { PillButton } from '@/shared/ui/pill-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

const c = {
  title: '#2E2331',
  subtitle: '#8A7E88',
  cardBg: '#FFFFFF',
  cardBorder: '#F2E9E0',
  cardText: '#2E2331',
  shadow: 'rgba(89,71,31,0.08)',
  pendingBg: '#F8E7C4',
  pendingText: '#A2761F',
  successBg: '#DFF1E4',
  successText: '#2E7D48',
  dangerBg: '#FBE3E0',
  dangerText: '#B42318',
} as const;

type StatusView = {
  glyph: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeBg: string;
  badgeText: string;
};

const STATUS_VIEW: Record<string, StatusView> = {
  pending: {
    glyph: '⏳',
    title: 'Документы отправлены',
    subtitle: 'Ожидают проверки модератором.',
    badge: 'Ожидает',
    badgeBg: c.pendingBg,
    badgeText: c.pendingText,
  },
  in_review: {
    glyph: '⏳',
    title: 'Документы на проверке',
    subtitle: 'Обычно занимает до 24 часов. Мы пришлём push-уведомление о решении модератора.',
    badge: 'На проверке',
    badgeBg: c.pendingBg,
    badgeText: c.pendingText,
  },
  approved: {
    glyph: '✓',
    title: 'Вы проверены',
    subtitle: 'Можно выходить на линию и принимать заказы.',
    badge: 'Одобрено',
    badgeBg: c.successBg,
    badgeText: c.successText,
  },
  rejected: {
    glyph: '✕',
    title: 'Документы отклонены',
    subtitle: 'Исправьте замечания и подайте документы повторно.',
    badge: 'Отклонено',
    badgeBg: c.dangerBg,
    badgeText: c.dangerText,
  },
};

const FALLBACK_VIEW: StatusView = {
  glyph: '⏳',
  title: 'Документы на проверке',
  subtitle: 'Обычно занимает до 24 часов. Мы пришлём push-уведомление о решении модератора.',
  badge: 'На проверке',
  badgeBg: c.pendingBg,
  badgeText: c.pendingText,
};

export function VerificationStatusScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { data: profile, isLoading, isFetching, refetch } = useGetDriverProfileQuery();

  const scale = width / DESIGN_WIDTH;
  const sx = (value: number) => value * scale;
  const sy = (value: number) => (value / DESIGN_HEIGHT) * height;

  if (isLoading) {
    return (
      <View style={styles.root}>
        <ScreenGradientBackground tone="rose" />
        <Loader />
      </View>
    );
  }

  // Профиля нет (403/404): пользователь вошёл, но водителем ещё не стал — ведём на анкету.
  if (!profile) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGradientBackground tone="rose" />
        <View
          style={{
            flex: 1,
            paddingBottom: insets.bottom + sy(28),
            paddingHorizontal: sx(32),
            paddingTop: Math.max(insets.top, sy(20)) + sy(90),
          }}
        >
          <View style={styles.center}>
            <GlowIcon glyph="🚗" size={sx(92)} />
            <Text style={[styles.title, { fontSize: sx(20), marginTop: sy(24) }]}>
              Станьте водителем Нур
            </Text>
            <Text style={[styles.subtitle, { fontSize: sx(13), marginTop: sy(8) }]}>
              Заполните анкету и загрузите документы — после проверки сможете принимать заказы.
            </Text>
          </View>
          <PillButton
            height={sx(58)}
            onPress={() => router.replace('/(verification)/registration')}
            title="Заполнить анкету"
          />
        </View>
      </View>
    );
  }

  const status = profile.verificationStatus;
  const view = STATUS_VIEW[status] ?? FALLBACK_VIEW;
  const isRejected = status === 'rejected';
  const isApproved = status === 'approved';

  const documentSummary = profile.documents?.length
    ? profile.documents
        .slice(0, 3)
        .map((doc) => t(`documents.${doc.type}`, { defaultValue: doc.type }))
        .join(', ') + (profile.documents.length > 3 ? '…' : '')
    : null;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGradientBackground tone="rose" />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: insets.bottom + sy(28),
          paddingHorizontal: sx(32),
          paddingTop: Math.max(insets.top, sy(20)) + sy(80),
        }}
        refreshControl={<RefreshControl onRefresh={refetch} refreshing={isFetching} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <GlowIcon glyph={view.glyph} size={sx(92)} />
          <Text style={[styles.title, { fontSize: sx(20), marginTop: sy(26) }]}>{view.title}</Text>
          <Text style={[styles.subtitle, { fontSize: sx(13), marginTop: sy(8) }]}>
            {view.subtitle}
          </Text>
        </View>

        {isRejected && profile.rejectionReason ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: c.dangerBg,
                borderColor: c.dangerBg,
                borderRadius: sx(18),
                marginTop: sy(24),
                paddingHorizontal: sx(20),
                paddingVertical: sy(16),
              },
            ]}
          >
            <Text style={{ color: c.dangerText, fontSize: sx(14), fontWeight: '600' }}>
              Причина отклонения
            </Text>
            <Text style={{ color: c.dangerText, fontSize: sx(13), marginTop: sy(4) }}>
              {profile.rejectionReason}
            </Text>
          </View>
        ) : null}

        {documentSummary ? (
          <View
            style={[
              styles.card,
              styles.cardRow,
              {
                borderRadius: sx(18),
                gap: sx(12),
                marginTop: sy(26),
                paddingHorizontal: sx(20),
                paddingVertical: sy(18),
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{ color: c.cardText, flex: 1, fontSize: sx(15), fontWeight: '500' }}
            >
              {documentSummary}
            </Text>
            <View
              style={{
                backgroundColor: view.badgeBg,
                borderRadius: sx(999),
                paddingHorizontal: sx(12),
                paddingVertical: sy(5),
              }}
            >
              <Text style={{ color: view.badgeText, fontSize: sx(12), fontWeight: '600' }}>
                {view.badge}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.spacer} />

        {isRejected ? (
          <PillButton
            height={sx(58)}
            onPress={() => router.replace('/(verification)/documents')}
            title="Подать повторно"
          />
        ) : isApproved ? (
          <PillButton
            height={sx(58)}
            onPress={() => router.replace('/(tabs)')}
            title="Выйти на линию"
          />
        ) : (
          <PillButton height={sx(58)} title="Связаться с поддержкой" variant="surface" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: c.cardBg,
    borderColor: c.cardBorder,
    borderWidth: 1,
    elevation: 2,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  cardRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  center: {
    alignItems: 'center',
    flex: 1,
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
  spacer: {
    flex: 1,
    minHeight: 24,
  },
  subtitle: {
    color: c.subtitle,
    lineHeight: 19,
    textAlign: 'center',
  },
  title: {
    color: c.title,
    fontWeight: '700',
    textAlign: 'center',
  },
});
