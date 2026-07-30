/**
 * Главный экран профиля (M2.2, Figma node 39:1090).
 */
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { formatPhone } from '@nurtaxi/shared-core/shared/lib';
import { ErrorView, Loader, Text } from '@nurtaxi/shared-core/shared/ui';
import { useAuth } from '@nurtaxi/shared-core/features/auth';
import { useGetMeQuery } from '@nurtaxi/shared-core/entities/user';

import { WelcomeGradientBackground } from '../../../auth/welcome-screen/ui/welcome-gradient-background';
import { ProfileMenuRow } from './profile-menu-row';

import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';

const colors = {
  background: '#F8F4EF',
  name: '#2E2331',
  phone: '#7A6E78',
  avatarBg: '#3A1D3F',
  avatarText: '#F7F3EE',
  logoutBg: 'rgba(255,255,255,0.85)',
  logoutBorder: 'rgba(255,255,255,0.9)',
  logoutText: '#7A6E78',
  shadow: 'rgba(89,71,31,0.06)',
} as const;

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

export function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 390;
  const tabBarInset = useGlassTabBarInset();
  const { logout } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useGetMeQuery();

  const confirmLogout = () => {
    Alert.alert(t('auth.logout'), t('auth.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.logout'),
        style: 'destructive',
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  const openSupport = () => {
    Alert.alert(t('profile.support'), t('profile.supportHint'));
  };

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <WelcomeGradientBackground />
        <Loader label={t('common.loading')} />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View style={styles.root}>
        <StatusBar style="dark" />
        <WelcomeGradientBackground />
        <View style={styles.errorWrap}>
          <ErrorView error={toAppError(error)} onRetry={refetch} retryLabel={t('common.retry')} />
        </View>
      </View>
    );
  }

  const displayName = profile.name ?? t('common.notSpecified');
  const initial = displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <WelcomeGradientBackground />

      <Image
        contentFit="cover"
        pointerEvents="none"
        source={ellipseTopAsset}
        style={[
          styles.ellipse,
          {
            height: scale * 560,
            left: scale * -90,
            top: scale * -200,
            width: scale * 560,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={{
          gap: scale * 10,
          paddingBottom: tabBarInset + scale * 24,
          paddingHorizontal: scale * 16,
          paddingTop: insets.top + scale * 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/profile/edit')}
          style={({ pressed }) => [
            styles.profileHeader,
            { opacity: pressed ? 0.92 : 1, paddingHorizontal: scale * 10 },
          ]}
        >
          {profile.photoUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: profile.photoUrl }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          )}

          <View style={styles.profileText}>
            <Text numberOfLines={1} style={[styles.name, { fontSize: scale * 22 }]}>
              {displayName}
            </Text>
            <Text style={[styles.phone, { fontSize: scale * 13 }]}>
              {formatPhone(profile.phone)}
            </Text>
          </View>
        </Pressable>

        <View style={{ gap: scale * 10, marginTop: scale * 20 }}>
          <ProfileMenuRow
            icon={{ ios: 'clock.fill', android: 'schedule', web: 'schedule' }}
            onPress={() => router.push('/profile/history')}
            title={t('profile.tripHistory')}
          />
          <ProfileMenuRow
            icon={{ ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' }}
            onPress={() => router.push('/profile/payment-methods')}
            title={t('profile.paymentMethods')}
          />
          <ProfileMenuRow
            icon={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }}
            onPress={() => router.push('/profile/addresses')}
            title={t('profile.favoriteAddresses')}
          />
          <ProfileMenuRow
            icon={{ ios: 'shield.fill', android: 'shield', web: 'shield' }}
            iconTone="safety"
            onPress={() => router.push('/profile/safety')}
            title={t('profile.safety')}
          />
          <ProfileMenuRow
            icon={{ ios: 'questionmark.circle.fill', android: 'help', web: 'help' }}
            onPress={openSupport}
            title={t('profile.support')}
          />
          <ProfileMenuRow
            icon={{ ios: 'gearshape.fill', android: 'settings', web: 'settings' }}
            iconTone="settings"
            onPress={() => router.push('/profile/settings')}
            title={t('profile.settingsTitle')}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={confirmLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            { marginTop: scale * 36, opacity: pressed ? 0.92 : 1 },
          ]}
        >
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.avatarBg,
    borderRadius: 999,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarImage: {
    borderRadius: 999,
    height: 64,
    width: 64,
  },
  avatarText: {
    color: colors.avatarText,
    fontSize: 24,
    fontWeight: '600',
  },
  ellipse: {
    position: 'absolute',
  },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.logoutBg,
    borderColor: colors.logoutBorder,
    borderRadius: 20,
    borderWidth: 1,
    elevation: 2,
    height: 58,
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  logoutText: {
    color: colors.logoutText,
    fontSize: 15,
    fontWeight: '500',
  },
  name: {
    color: colors.name,
    fontWeight: '600',
  },
  phone: {
    color: colors.phone,
    marginTop: 4,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  profileText: {
    flex: 1,
    justifyContent: 'center',
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
