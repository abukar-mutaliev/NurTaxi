/**
 * Конфигурация приложения клиента (M0.6, M0.10, M0.11).
 *
 * Одна кодовая база — три окружения. Переключение через `EXPO_PUBLIC_ENV`; для каждого
 * окружения свой bundle identifier и scheme, поэтому dev-, staging- и prod-сборки
 * устанавливаются на устройство одновременно.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

type Environment = 'development' | 'staging' | 'production';

const environment = (process.env.EXPO_PUBLIC_ENV as Environment) ?? 'development';

const VARIANTS: Record<
  Environment,
  { name: string; identifier: string; scheme: string; defaultApiUrl: string }
> = {
  development: {
    name: 'Nur Taxi Dev',
    identifier: 'ru.nurtaxi.client.dev',
    scheme: 'nurtaxi-dev',
    // 10.0.2.2 — адрес хоста внутри эмулятора Android; для устройства укажите IP компьютера.
    defaultApiUrl: 'http://10.0.2.2:3000/api/v1',
  },
  staging: {
    name: 'Nur Taxi Staging',
    identifier: 'ru.nurtaxi.client.staging',
    scheme: 'nurtaxi-staging',
    defaultApiUrl: 'https://taxi.rulplus.ru/api/v1',
  },
  production: {
    name: 'Nur Taxi',
    identifier: 'ru.nurtaxi.client',
    scheme: 'nurtaxi',
    defaultApiUrl: 'https://api.nurtaxi.ru/api/v1',
  },
};

const variant = VARIANTS[environment];
const yandexMapKitApiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.name,
  slug: 'nurtaxi-client',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: variant.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: variant.identifier,
    supportsTablet: false,
    infoPlist: {
      // Dev API по HTTP — разрешаем незащищённый трафик к локальной сети.
      ...(environment === 'development'
        ? { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } }
        : {}),
      // Разрешения запрашиваются только при реальной необходимости (`§8.8`, App Store review).
      NSLocationWhenInUseUsageDescription:
        'Nur Taxi показывает вашу точку подачи на карте и находит ближайших водителей.',
      NSCameraUsageDescription: 'Nur Taxi использует камеру для съёмки фото профиля.',
      NSPhotoLibraryUsageDescription: 'Nur Taxi использует галерею для выбора фото профиля.',
      NSMicrophoneUsageDescription:
        'Nur Taxi использует микрофон для аудиозаписи поездки в целях безопасности.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: variant.identifier,
    adaptiveIcon: {
      backgroundColor: '#DCEDE8',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'CAMERA',
      'READ_MEDIA_IMAGES',
      'RECORD_AUDIO',
      'POST_NOTIFICATIONS',
      'VIBRATE',
    ],
  },

  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },

  plugins: [
    // Маршруты живут в `app/`, а `src/` целиком отдан слоям FSD.
    ['expo-router', { root: './app' }],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#1B6B5A',
        image: './assets/images/splash-icon.png',
        imageWidth: 96,
      },
    ],
    'expo-secure-store',
    'expo-localization',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Nur Taxi показывает вашу точку подачи на карте и находит ближайших водителей.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Nur Taxi использует галерею для выбора фото профиля.',
        cameraPermission: 'Nur Taxi использует камеру для съёмки фото профиля.',
        microphonePermission: false,
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission:
          'Nur Taxi использует микрофон для аудиозаписи поездки в целях безопасности.',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#1B6B5A',
        defaultChannel: 'orders',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 26,
          // Dev API на http://192.168.x.x — без этого Android (EAS build) блокирует cleartext HTTP.
          usesCleartextTraffic: environment === 'development',
        },
        ios: { deploymentTarget: '16.4' },
      },
    ],
    [
      'expo-yandex-mapkit',
      {
        apiKey: yandexMapKitApiKey,
        locale: 'ru_RU',
        flavor: 'lite',
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },

  extra: {
    environment,
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? variant.defaultApiUrl,
    wsUrl: process.env.EXPO_PUBLIC_WS_URL,
    requestTimeoutMs: Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS ?? 15000),
    debugNetwork: process.env.EXPO_PUBLIC_DEBUG_NETWORK === 'true',
    yandexMapKitApiKey,
    yandexMapKitApiKeyConfigured: Boolean(yandexMapKitApiKey),
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? '23171864-56c6-4858-9b1c-16b8a3740906',
    },
  },

  owner: process.env.EAS_OWNER ?? 'abuingush',
  updates: {
    url: process.env.EAS_UPDATE_URL ?? 'https://u.expo.dev/23171864-56c6-4858-9b1c-16b8a3740906',
  },
  runtimeVersion: { policy: 'appVersion' },
});
