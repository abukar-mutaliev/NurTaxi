/**
 * Экран безопасности (Figma node 39:1088): SOS, аудиозапись, проверка водителя.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import { useActivateSosMutation, useGetOrderQuery } from '@nurtaxi/shared-core/entities/order';
import { useGetEmergencyContactsQuery } from '@nurtaxi/shared-core/entities/emergency-contact';

import { useAppSelector } from '@/app/store/hooks';

import { selectActiveOrderId } from '@/processes/order-flow';
import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';
import { GlassScreenHeader } from '@/shared/ui';

import { WelcomeGradientBackground } from '../../../auth/welcome-screen/ui/welcome-gradient-background';
import { SafetyFeatureRow } from './safety-feature-row';

const colors = {
  background: '#F8F4EF',
  title: '#2E2331',
  subtitle: '#7A6E78',
  panicGlow: 'rgba(232,93,74,0.22)',
  panicButton: '#E85D4A',
  panicButtonInner: '#FFFFFF',
  panicShadow: 'rgba(232,93,74,0.35)',
} as const;

const ellipseTopAsset = require('@/assets/images/welcome/ellipse-top.png');

export function SafetyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scale = width / 390;
  const tabBarInset = useGlassTabBarInset();

  const activeOrderId = useAppSelector(selectActiveOrderId);
  const { data: activeOrder } = useGetOrderQuery(activeOrderId ?? '', {
    skip: !activeOrderId,
  });
  const { data: contacts = [] } = useGetEmergencyContactsQuery();
  const [activateSos, sosState] = useActivateSosMutation();

  const showComingSoon = (message: string) => {
    Alert.alert(t('common.ok'), message);
  };

  const triggerPanic = () => {
    if (activeOrderId && activeOrder) {
      if (contacts.length === 0) {
        Alert.alert(t('sos.title'), t('sos.noContacts'), [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('safety.goToContacts'),
            onPress: () => router.push('/profile/emergency-contacts'),
          },
        ]);
        return;
      }

      Alert.alert(t('sos.title'), t('sos.description'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('sos.confirm'),
          style: 'destructive',
          onPress: () => {
            void activateSos({
              orderId: activeOrderId,
              lat: activeOrder.pickupLat,
              lng: activeOrder.pickupLng,
              address: activeOrder.pickupAddress,
            })
              .unwrap()
              .then((response) => {
                Alert.alert(
                  t('sos.activated'),
                  t('sos.contactsNotified', { count: response.contactsNotified }),
                );
              })
              .catch((cause) => {
                Alert.alert(t('errors.title'), toAppError(cause as never).message);
              });
          },
        },
      ]);
      return;
    }

    Alert.alert(t('safety.panicTitle'), t('safety.panicOutsideTrip'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('safety.goToContacts'),
        onPress: () => router.push('/profile/emergency-contacts'),
      },
    ]);
  };

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
          gap: scale * 20,
          paddingBottom: tabBarInset + scale * 24,
          paddingHorizontal: scale * 16,
          paddingTop: insets.top + scale * 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassScreenHeader title={t('profile.safety')} />

        <Pressable
          accessibilityRole="button"
          disabled={sosState.isLoading}
          onPress={triggerPanic}
          style={({ pressed }) => [{ opacity: pressed || sosState.isLoading ? 0.94 : 1 }]}
        >
          <LinearGradient
            colors={['#FDF0EC', '#FADDD6']}
            end={{ x: 1, y: 0.5 }}
            start={{ x: 0, y: 0.5 }}
            style={[styles.panicCard, { borderRadius: scale * 28, height: scale * 132 }]}
          >
            <View style={styles.panicText}>
              <Text style={[styles.panicTitle, { fontSize: scale * 17 }]}>
                {t('safety.panicTitle')}
              </Text>
              <Text
                style={[styles.panicSubtitle, { fontSize: scale * 13, lineHeight: scale * 18 }]}
              >
                {t('safety.panicSubtitle')}
              </Text>
            </View>

            <View
              pointerEvents="none"
              style={[
                styles.panicGlow,
                {
                  height: scale * 150,
                  right: scale * -10,
                  top: scale * -10,
                  width: scale * 150,
                },
              ]}
            />

            <View
              style={[
                styles.panicButtonOuter,
                {
                  height: scale * 56,
                  right: scale * 30,
                  top: scale * 38,
                  width: scale * 56,
                },
              ]}
            >
              <View
                style={[
                  styles.panicButtonInner,
                  {
                    height: scale * 20,
                    width: scale * 20,
                  },
                ]}
              />
            </View>
          </LinearGradient>
        </Pressable>

        <View style={{ gap: scale * 20 }}>
          <SafetyFeatureRow
            onPress={() => showComingSoon(t('safety.audioComingSoon'))}
            subtitle={t('safety.audioSubtitle')}
            title={t('safety.audioTitle')}
          />
          <SafetyFeatureRow
            iconTone="safety"
            onPress={() => showComingSoon(t('safety.driverCheckComingSoon'))}
            subtitle={t('safety.driverCheckSubtitle')}
            title={t('safety.driverCheckTitle')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ellipse: {
    position: 'absolute',
  },
  panicButtonInner: {
    backgroundColor: colors.panicButtonInner,
    borderRadius: 999,
  },
  panicButtonOuter: {
    alignItems: 'center',
    backgroundColor: colors.panicButton,
    borderRadius: 999,
    elevation: 6,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: colors.panicShadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  panicCard: {
    overflow: 'hidden',
    shadowColor: 'rgba(89,71,31,0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 26,
  },
  panicGlow: {
    backgroundColor: colors.panicGlow,
    borderRadius: 999,
    position: 'absolute',
  },
  panicSubtitle: {
    color: colors.subtitle,
    marginTop: 8,
  },
  panicText: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    zIndex: 1,
  },
  panicTitle: {
    color: colors.title,
    fontWeight: '600',
  },
  root: {
    backgroundColor: colors.background,
    flex: 1,
  },
});
