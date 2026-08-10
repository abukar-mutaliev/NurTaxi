/**
 * Экран безопасности (Figma node 39:1088): SOS, аудиозапись, проверка водителя.
 */
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import { Text } from '@nurtaxi/shared-core/shared/ui';
import {
  isTripRecordingAllowed,
  useActivateSosMutation,
  useGetOrderQuery,
} from '@nurtaxi/shared-core/entities/order';
import { useGetEmergencyContactsQuery } from '@nurtaxi/shared-core/entities/emergency-contact';

import { useAppSelector } from '@/app/store/hooks';
import {
  SafetyFeatureRow,
  TripAudioRecordingRow,
  type TripAudioRecordingDialogState,
  type TripAudioRecordingHandlers,
} from '@/features/safety';

import { selectActiveOrderId } from '@/processes/order-flow';
import { useGlassTabBarInset } from '@/shared/hooks/use-glass-tab-bar-inset';
import { GlassConfirmDialog, GlassScreenHeader } from '@/shared/ui';

import { WelcomeGradientBackground } from '../../../auth/welcome-screen/ui/welcome-gradient-background';

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

type SafetyDialogState =
  | null
  | { kind: 'info'; message: string }
  | { kind: 'noContacts' }
  | { kind: 'sosConfirm' }
  | { kind: 'outsideTrip' }
  | { kind: 'sosSuccess'; count: number }
  | { kind: 'error'; message: string }
  | { kind: 'audioOutsideTrip' }
  | { kind: 'audioStopConfirm' }
  | { kind: 'audioPermission' }
  | { kind: 'audioSaved' };

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
  const [dialog, setDialog] = useState<SafetyDialogState>(null);

  const canRecordAudio = Boolean(
    activeOrderId && activeOrder && isTripRecordingAllowed(activeOrder.status),
  );
  const audioHandlersRef = useRef<TripAudioRecordingHandlers | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);

  const closeDialog = () => {
    setDialog(null);
    audioHandlersRef.current?.clearError();
  };

  const handleAudioDialog = useCallback((nextDialog: TripAudioRecordingDialogState) => {
    setDialog(nextDialog);
  }, []);

  const handleBindAudioHandlers = useCallback((handlers: TripAudioRecordingHandlers) => {
    audioHandlersRef.current = handlers;
  }, []);

  const handleAudioUploadingChange = useCallback((isUploading: boolean) => {
    setAudioUploading(isUploading);
  }, []);

  const confirmStopRecording = () => {
    closeDialog();
    audioHandlersRef.current?.confirmStopRecording();
  };

  const openSettings = () => {
    closeDialog();
    audioHandlersRef.current?.openSettings();
  };

  const goToContacts = () => {
    closeDialog();
    router.push('/profile/emergency-contacts');
  };

  const showComingSoon = (message: string) => {
    setDialog({ kind: 'info', message });
  };

  const confirmSos = () => {
    if (!activeOrderId || !activeOrder) {
      return;
    }

    void activateSos({
      orderId: activeOrderId,
      lat: activeOrder.pickupLat,
      lng: activeOrder.pickupLng,
      address: activeOrder.pickupAddress,
    })
      .unwrap()
      .then((response) => {
        setDialog({ kind: 'sosSuccess', count: response.contactsNotified });
      })
      .catch((cause) => {
        setDialog({ kind: 'error', message: toAppError(cause as never).message });
      });
  };

  const triggerPanic = () => {
    if (activeOrderId && activeOrder) {
      if (contacts.length === 0) {
        setDialog({ kind: 'noContacts' });
        return;
      }

      setDialog({ kind: 'sosConfirm' });
      return;
    }

    setDialog({ kind: 'outsideTrip' });
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
          <TripAudioRecordingRow
            canRecord={canRecordAudio}
            onBindHandlers={handleBindAudioHandlers}
            onDialog={handleAudioDialog}
            onStubPress={() => {
              setDialog({ kind: 'info', message: t('safety.audioRequiresRebuild') });
            }}
            onUploadingChange={handleAudioUploadingChange}
            orderId={activeOrderId}
          />
          <SafetyFeatureRow
            iconTone="safety"
            onPress={() => showComingSoon(t('safety.driverCheckComingSoon'))}
            subtitle={t('safety.driverCheckSubtitle')}
            title={t('safety.driverCheckTitle')}
          />
        </View>
      </ScrollView>

      <GlassConfirmDialog
        actions={
          dialog?.kind === 'noContacts' || dialog?.kind === 'outsideTrip'
            ? [{ title: t('safety.goToContacts'), onPress: goToContacts }]
            : undefined
        }
        confirmTitle={
          dialog?.kind === 'info' ||
          dialog?.kind === 'sosSuccess' ||
          dialog?.kind === 'error' ||
          dialog?.kind === 'audioOutsideTrip' ||
          dialog?.kind === 'audioSaved'
            ? t('common.ok')
            : dialog?.kind === 'sosConfirm'
              ? t('sos.confirm')
              : dialog?.kind === 'audioStopConfirm'
                ? t('safety.audioStopConfirm')
                : dialog?.kind === 'audioPermission'
                  ? t('safety.audioOpenSettings')
                  : undefined
        }
        destructive={dialog?.kind === 'sosConfirm'}
        dismissable={
          (dialog?.kind !== 'sosConfirm' || !sosState.isLoading) &&
          dialog?.kind !== 'audioStopConfirm'
        }
        loading={
          (dialog?.kind === 'sosConfirm' && sosState.isLoading) ||
          (dialog?.kind === 'audioStopConfirm' && audioUploading)
        }
        message={
          dialog?.kind === 'info'
            ? dialog.message
            : dialog?.kind === 'noContacts'
              ? t('sos.noContacts')
              : dialog?.kind === 'sosConfirm'
                ? t('sos.description')
                : dialog?.kind === 'outsideTrip'
                  ? t('safety.panicOutsideTrip')
                  : dialog?.kind === 'audioOutsideTrip'
                    ? t('safety.audioOutsideTrip')
                    : dialog?.kind === 'audioStopConfirm'
                      ? t('safety.audioStopMessage')
                      : dialog?.kind === 'audioPermission'
                        ? t('safety.audioPermissionMessage')
                        : dialog?.kind === 'audioSaved'
                          ? t('safety.audioSaved')
                          : dialog?.kind === 'sosSuccess'
                            ? t('sos.contactsNotified', { count: dialog.count })
                            : dialog?.kind === 'error'
                              ? dialog.message
                              : undefined
        }
        onCancel={closeDialog}
        onConfirm={
          dialog?.kind === 'sosConfirm'
            ? confirmSos
            : dialog?.kind === 'audioStopConfirm'
              ? confirmStopRecording
              : dialog?.kind === 'audioPermission'
                ? openSettings
                : dialog?.kind === 'info' ||
                    dialog?.kind === 'sosSuccess' ||
                    dialog?.kind === 'error' ||
                    dialog?.kind === 'audioOutsideTrip' ||
                    dialog?.kind === 'audioSaved'
                  ? closeDialog
                  : undefined
        }
        showCancel={
          dialog?.kind === 'noContacts' ||
          dialog?.kind === 'outsideTrip' ||
          dialog?.kind === 'sosConfirm' ||
          dialog?.kind === 'audioStopConfirm' ||
          dialog?.kind === 'audioPermission'
        }
        title={
          dialog?.kind === 'noContacts' || dialog?.kind === 'sosConfirm'
            ? t('sos.title')
            : dialog?.kind === 'outsideTrip'
              ? t('safety.panicTitle')
              : dialog?.kind === 'audioOutsideTrip'
                ? t('safety.audioTitle')
                : dialog?.kind === 'audioStopConfirm'
                  ? t('safety.audioStopTitle')
                  : dialog?.kind === 'audioPermission'
                    ? t('safety.audioPermissionTitle')
                    : dialog?.kind === 'audioSaved'
                      ? t('safety.audioTitle')
                      : dialog?.kind === 'sosSuccess'
                        ? t('sos.activated')
                        : dialog?.kind === 'error'
                          ? t('errors.title')
                          : undefined
        }
        visible={dialog !== null}
      />
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
