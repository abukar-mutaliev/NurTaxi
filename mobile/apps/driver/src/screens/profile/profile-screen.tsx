/**
 * Профиль водителя (M7.5): фото, сводка по доходу, автомобиль, документы, поддержка, выход.
 *
 * Данные берутся из `GET /driver/profile` и `GET /driver/earnings`; счётчик одобренных
 * документов считается по `profile.documents`, чтобы не дублировать логику на сервере.
 */
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView } from 'expo-symbols';
import medium from 'expo-symbols/androidWeights/medium';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatMoney, formatRating } from '@nurtaxi/shared-core/shared/lib';
import { brandColors, Loader, showAlert, Text, useTheme } from '@nurtaxi/shared-core/shared/ui';
import { DriverRequirementKey, RequirementMode } from '@nurtaxi/shared-core/shared/model';
import {
  requirementMode,
  useGetDriverEarningsQuery,
  useGetDriverProfileQuery,
} from '@nurtaxi/shared-core/entities/driver';
import { useGetMeQuery } from '@nurtaxi/shared-core/entities/user';
import { useAuth } from '@nurtaxi/shared-core/features/auth';

import { useProfilePhotoUpload } from '@/features/profile-photo';
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
  // Фото берём из `/me`: там готовая ссылка, а в `/driver/profile` — ключ объекта в хранилище.
  const { data: me } = useGetMeQuery();
  const { changePhoto, isUploading } = useProfilePhotoUpload();
  const { logout } = useAuth();

  const openSupport = () => {
    showAlert(t('profile.support'), t('profile.supportHint'), [
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

  const photoUrl = me?.photoUrl ?? null;
  const vehicle = profile?.vehicles?.[0];
  const documents = profile?.documents ?? [];
  const approvedDocs = documents.filter((doc) => doc.status === 'approved').length;
  const isVerified = profile?.verificationStatus === 'approved';

  // Блок разрешения включается для каждого региона отдельно — вне таких регионов не показываем.
  const permitMode = requirementMode(profile?.requirements, DriverRequirementKey.TaxiPermit);
  const permit = profile?.taxiPermit;
  const permitSubtitle = permit
    ? [
        permit.number,
        permit.expiresAt ? `до ${permit.expiresAt}` : 'бессрочное',
        permit.isExpired ? 'просрочено' : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : permitMode === RequirementMode.Required
      ? 'Не указано — требуется в вашем регионе'
      : 'Не указано';

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
          <Pressable
            accessibilityLabel={photoUrl ? 'Изменить фото профиля' : 'Добавить фото профиля'}
            accessibilityRole="button"
            disabled={isUploading}
            hitSlop={8}
            onPress={() => void changePhoto()}
          >
            <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
              {photoUrl ? (
                <Image
                  contentFit="cover"
                  source={{ uri: photoUrl }}
                  style={StyleSheet.absoluteFill}
                  transition={150}
                />
              ) : (
                <Text style={styles.avatarText}>{initial(profile?.fullName)}</Text>
              )}
              {isUploading ? (
                <View style={[StyleSheet.absoluteFill, styles.avatarBusy]}>
                  <ActivityIndicator color={brandColors.onPrimary} />
                </View>
              ) : null}
            </View>
            {/* Значок камеры подсказывает, что аватар нажимается: без него фото не найти. */}
            <View
              style={[
                styles.avatarBadge,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <SymbolView
                name={{ android: 'photo_camera', ios: 'camera.fill', web: 'photo_camera' }}
                resizeMode="scaleAspectFit"
                size={14}
                tintColor={theme.colors.primary}
                type="monochrome"
                weight={{ android: medium, ios: 'medium' }}
              />
            </View>
          </Pressable>

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
          icon="car"
          onPress={() => router.push('/(verification)/registration')}
          subtitle={
            vehicle
              ? `${vehicle.make} ${vehicle.model} · ${vehicle.plateNumber} · ${vehicle.color}`
              : 'Не указан'
          }
          title={t('driver.vehicle')}
        />
        {permitMode === RequirementMode.Hidden ? null : (
          <MenuCard
            dotTone={permit && !permit.isExpired ? undefined : 'accent'}
            icon="documents"
            onPress={() => router.push('/(verification)/registration?section=permit' as Href)}
            subtitle={permitSubtitle}
            title="Разрешение такси"
          />
        )}
        <MenuCard
          icon="documents"
          onPress={() => router.push('/(verification)/documents')}
          subtitle={
            documents.length ? `${approvedDocs} из ${documents.length} одобрено` : 'Не загружены'
          }
          title="Документы"
        />
        <MenuCard
          icon="history"
          onPress={() => router.push('/(tabs)/orders' as Href)}
          title="История поездок"
        />
        <MenuCard
          icon="settings"
          onPress={() => router.push('/settings' as Href)}
          title={t('profile.settingsTitle')}
        />
        <MenuCard icon="support" onPress={openSupport} title={t('profile.support')} />

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
    borderRadius: 31,
    height: 62,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 62,
  },
  avatarBadge: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    bottom: -2,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 24,
  },
  avatarBusy: {
    alignItems: 'center',
    backgroundColor: brandColors.overlay,
    justifyContent: 'center',
  },
  avatarText: {
    color: brandColors.onPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    elevation: 1,
    shadowColor: brandColors.shadow,
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
    backgroundColor: brandColors.background,
    flex: 1,
  },
});
