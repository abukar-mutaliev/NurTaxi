/**
 * Профиль водителя (M7.5): сводка по доходу, автомобиль, документы, поддержка, выход.
 *
 * Данные берутся из `GET /driver/profile` и `GET /driver/earnings`; счётчик одобренных
 * документов считается по `profile.documents`, чтобы не дублировать логику на сервере.
 */
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney, formatRating } from '@nurtaxi/shared-core/shared/lib';
import { Loader, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import {
  useGetDriverEarningsQuery,
  useGetDriverProfileQuery,
} from '@nurtaxi/shared-core/entities/driver';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

import { getGlassTabBarBottomInset } from '@/shared/constants/glass-tab-bar';
import { MenuCard } from '@/shared/ui/menu-card';
import { PillButton } from '@/shared/ui/pill-button';
import { ScreenGradientBackground } from '@/shared/ui/screen-gradient-background';
import { StatTiles } from '@/shared/ui/stat-tiles';

/** Адрес поддержки из `profile.supportHint` — держим рядом, чтобы тексты не разъезжались. */
const SUPPORT_EMAIL = 'support@nurtaxi.ru';

/** Инициалы для аватара: одна буква, как в макете. */
function initial(name?: string | null): string {
  return name?.trim()?.[0]?.toUpperCase() ?? '—';
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: profile, isLoading } = useGetDriverProfileQuery();
  const { data: earnings } = useGetDriverEarningsQuery();
  const { logout } = useAuth();

  const openSupport = () => {
    Alert.alert(t('profile.support'), t('profile.supportHint'), [
      { style: 'cancel', text: t('common.cancel') },
      {
        onPress: () => {
          void Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
        },
        text: 'Написать',
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.root}>
        <ScreenGradientBackground tone="rose" />
        <Loader />
      </View>
    );
  }

  const vehicle = profile?.vehicles?.[0];
  const documents = profile?.documents ?? [];
  const approvedDocs = documents.filter((doc) => doc.status === 'approved').length;
  const isVerified = profile?.verificationStatus === 'approved';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGradientBackground tone="rose" />

      <ScrollView
        contentContainerStyle={{
          gap: theme.spacing.md,
          paddingBottom: getGlassTabBarBottomInset(insets.bottom) + theme.spacing.lg,
          paddingHorizontal: theme.spacing.lg,
          paddingTop: Math.max(insets.top, theme.spacing.xxl) + theme.spacing.md,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.headerTitle} variant="subtitle">
          {t('profile.title')}
        </Text>

        {/* Водитель */}
        <View style={[styles.identity, { gap: theme.spacing.md }]}>
          <View
            style={[styles.avatar, { backgroundColor: theme.colors.primary, borderRadius: 999 }]}
          >
            <Text style={styles.avatarText}>{initial(profile?.fullName)}</Text>
          </View>

          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <Text variant="subtitle">{profile?.fullName ?? '—'}</Text>
            <View style={[styles.identityMeta, { gap: theme.spacing.sm }]}>
              {isVerified ? (
                <View
                  style={{
                    backgroundColor: theme.colors.successSurface,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: 2,
                  }}
                >
                  <Text style={{ color: theme.colors.success }} variant="micro">
                    ✓ Проверена
                  </Text>
                </View>
              ) : null}
              <Text style={{ color: theme.colors.accent }} variant="label">
                ★ {formatRating(profile?.rating ?? 5)}
              </Text>
            </View>
          </View>
        </View>

        {/* Доход */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
            },
          ]}
        >
          <Text variant="bodyStrong">{t('driver.earnings')}</Text>
          <StatTiles
            tiles={[
              { label: 'День', value: formatMoney(earnings?.today ?? 0) },
              { label: t('driver.earningsWeek'), value: formatMoney(earnings?.week ?? 0) },
              { label: t('driver.earningsMonth'), value: formatMoney(earnings?.month ?? 0) },
            ]}
          />
        </View>

        {/* Меню */}
        <MenuCard
          dotTone="accent"
          onPress={() => router.push('/(verification)/registration')}
          subtitle={
            vehicle
              ? `${vehicle.make} ${vehicle.model} · ${vehicle.plateNumber} · ${vehicle.color}`
              : 'Не указан'
          }
          title={t('driver.vehicle')}
        />
        <MenuCard
          onPress={() => router.push('/(verification)/documents')}
          subtitle={
            documents.length ? `${approvedDocs} из ${documents.length} одобрено` : 'Не загружены'
          }
          title="Документы"
        />
        <MenuCard onPress={() => router.push('/(tabs)/orders' as Href)} title="История поездок" />
        <MenuCard onPress={openSupport} title={t('profile.support')} />

        <PillButton
          onPress={() => {
            void logout();
          }}
          style={{ marginTop: theme.spacing.sm }}
          title={t('auth.logout')}
          variant="surface"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    height: 62,
    justifyContent: 'center',
    width: 62,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    elevation: 1,
    shadowColor: 'rgba(89,71,31,0.07)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  headerTitle: {
    textAlign: 'center',
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 4,
  },
  identityMeta: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  root: {
    backgroundColor: '#F8F4EF',
    flex: 1,
  },
});
