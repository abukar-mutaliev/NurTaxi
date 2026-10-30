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
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  brandColors,
  Loader,
  radius,
  shadows,
  Text,
  typeScale,
} from '@nurtaxi/shared-core/shared/ui';
import { rejectedDocuments, useGetDriverProfileQuery } from '@nurtaxi/shared-core/entities/driver';

import { GlowIcon } from '@/shared/ui/glow-icon';
import { PillButton } from '@/shared/ui/pill-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';

const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

/**
 * Поддержка отвечает в WhatsApp: +7 928 697-06-97.
 * `wa.me` требует номер без плюса и разделителей; без установленного WhatsApp ссылка
 * откроется в браузере и предложит продолжить в приложении — запасной путь не нужен.
 */
const SUPPORT_WHATSAPP_URL = 'https://wa.me/79286970697';

const c = {
  title: brandColors.text,
  subtitle: brandColors.textMuted,
  cardBg: brandColors.surface,
  cardBorder: brandColors.surfaceMuted,
  cardText: brandColors.text,
  shadow: brandColors.shadow,
  pendingBg: brandColors.secondarySoft,
  pendingText: brandColors.primary,
  successBg: brandColors.primarySoft,
  successText: brandColors.primary,
  dangerBg: brandColors.dangerSoft,
  dangerText: brandColors.danger,
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
  /**
   * Анкета заведена, но на проверку не отправлена. Без этой ветки срабатывала заглушка
   * «Документы на проверке», и водитель видел, что всё отправлено, не загрузив и половины.
   */
  draft: {
    glyph: '📄',
    title: 'Документы не отправлены',
    subtitle: 'Загрузите оставшиеся документы и отправьте анкету на проверку.',
    badge: 'Черновик',
    badgeBg: c.pendingBg,
    badgeText: c.pendingText,
  },
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

/**
 * Неизвестный статус нельзя выдавать за «на проверке»: если сервер заведёт новый, водитель
 * решит, что от него ничего не требуется, и будет ждать решения, которого никто не выносит.
 */
const FALLBACK_VIEW: StatusView = {
  glyph: '📄',
  title: 'Проверьте документы',
  subtitle: 'Откройте список документов и убедитесь, что всё загружено и отправлено.',
  badge: 'Требует внимания',
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

  const openSupportChat = () => {
    void Linking.openURL(SUPPORT_WHATSAPP_URL);
  };

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
            <Text style={[styles.title, { fontSize: sx(typeScale.xl), marginTop: sy(24) }]}>
              Станьте водителем Нур
            </Text>
            <Text style={[styles.subtitle, { fontSize: sx(typeScale.sm), marginTop: sy(8) }]}>
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
  // Пока модератор смотрит анкету, документы менять нельзя — только открыть и посмотреть.
  const isLocked = status === 'in_review' || isApproved;

  const rejectedDocs = rejectedDocuments(profile);
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
          <Text style={[styles.title, { fontSize: sx(typeScale.xl), marginTop: sy(26) }]}>
            {view.title}
          </Text>
          <Text style={[styles.subtitle, { fontSize: sx(typeScale.sm), marginTop: sy(8) }]}>
            {view.subtitle}
          </Text>
        </View>

        {isRejected && rejectedDocs.length > 0 ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: c.dangerBg,
                borderColor: c.dangerBg,
                borderRadius: sx(radius.lg),
                marginTop: sy(24),
                paddingHorizontal: sx(20),
                paddingVertical: sy(16),
              },
            ]}
          >
            <Text style={{ color: c.dangerText, fontSize: sx(typeScale.md), fontWeight: '600' }}>
              Нужно заменить
            </Text>
            {rejectedDocs.map((doc) => (
              <View key={doc.id} style={{ marginTop: sy(10) }}>
                <Text
                  style={{ color: c.dangerText, fontSize: sx(typeScale.sm), fontWeight: '600' }}
                >
                  {t(`documents.${doc.type}`, { defaultValue: doc.type })}
                </Text>
                {doc.rejectionReason ? (
                  <Text
                    style={{ color: c.dangerText, fontSize: sx(typeScale.sm), marginTop: sy(2) }}
                  >
                    {doc.rejectionReason}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : isRejected && profile.rejectionReason ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: c.dangerBg,
                borderColor: c.dangerBg,
                borderRadius: sx(radius.lg),
                marginTop: sy(24),
                paddingHorizontal: sx(20),
                paddingVertical: sy(16),
              },
            ]}
          >
            <Text style={{ color: c.dangerText, fontSize: sx(typeScale.md), fontWeight: '600' }}>
              Причина отклонения
            </Text>
            <Text style={{ color: c.dangerText, fontSize: sx(typeScale.sm), marginTop: sy(4) }}>
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
                borderRadius: sx(radius.lg),
                gap: sx(12),
                marginTop: sy(26),
                paddingHorizontal: sx(20),
                paddingVertical: sy(18),
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={{
                color: c.cardText,
                flex: 1,
                fontSize: sx(typeScale.base),
                fontWeight: '500',
              }}
            >
              {documentSummary}
            </Text>
            <View
              style={{
                backgroundColor: view.badgeBg,
                borderRadius: sx(radius.pill),
                paddingHorizontal: sx(12),
                paddingVertical: sy(5),
              }}
            >
              <Text
                style={{ color: view.badgeText, fontSize: sx(typeScale.xs), fontWeight: '600' }}
              >
                {view.badge}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.spacer} />

        <View style={{ gap: sy(12) }}>
          {isApproved ? (
            <PillButton
              height={sx(58)}
              onPress={() => router.replace('/(tabs)')}
              title="Выйти на линию"
            />
          ) : (
            <PillButton
              height={sx(58)}
              onPress={() => router.push('/(verification)/documents')}
              title={
                isRejected
                  ? 'Исправить документы'
                  : isLocked
                    ? 'Мои документы'
                    : 'Продолжить загрузку'
              }
            />
          )}

          {isApproved ? null : (
            <PillButton
              height={sx(58)}
              onPress={openSupportChat}
              title="Связаться с поддержкой"
              variant="surface"
            />
          )}
        </View>
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
    ...shadows.md,
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
    backgroundColor: brandColors.background,
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
