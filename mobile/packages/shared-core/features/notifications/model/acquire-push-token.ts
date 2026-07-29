/**
 * Получение Expo push token (M10.1).
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { PushPlatform } from '@nurtaxi/shared-core/shared/model';

import { ensurePushChannels } from './push-channels';

export interface PushTokenResult {
  token: string;
  platform: PushPlatform;
}

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function acquirePushToken(): Promise<PushTokenResult | null> {
  if (!Device.isDevice) {
    return null;
  }

  await ensurePushChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
    return null;
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    console.warn('[push] EAS projectId is missing — cannot obtain Expo push token');
    return null;
  }

  try {
    const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
    return {
      token: pushToken.data,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    };
  } catch (error) {
    console.warn('[push] Expo push token unavailable (FCM not configured)', error);
    return null;
  }
}
