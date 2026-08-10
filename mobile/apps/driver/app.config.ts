/**
 * Конфигурация приложения водителя (M0.6, M0.10, M0.11).
 *
 * Отличия от клиента: фоновое отслеживание геопозиции для матчинга (`M8.2`), звук и
 * вибрация на входящие заказы (`M8.3`), отдельные bundle identifier и scheme.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

type Environment = 'development' | 'staging' | 'production';

const environment = (process.env.EXPO_PUBLIC_ENV as Environment) ?? 'development';

const VARIANTS: Record<
  Environment,
  { name: string; identifier: string; scheme: string; defaultApiUrl: string }
> = {
  development: {
    name: 'Nur Taxi Водитель Dev',
    identifier: 'ru.nurtaxi.driver.dev',
    scheme: 'nurtaxi-driver-dev',
    // 10.0.2.2 — адрес хоста внутри эмулятора Android; для устройства укажите IP компьютера.
    defaultApiUrl: 'http://10.0.2.2:3000/api/v1',
  },
  staging: {
    name: 'Nur Taxi Водитель Staging',
    identifier: 'ru.nurtaxi.driver.staging',
    scheme: 'nurtaxi-driver-staging',
    defaultApiUrl: 'https://staging.nurtaxi.ru/api/v1',
  },
  production: {
    name: 'Nur Taxi Водитель',
    identifier: 'ru.nurtaxi.driver',
    scheme: 'nurtaxi-driver',
    defaultApiUrl: 'https://api.nurtaxi.ru/api/v1',
  },
};

const variant = VARIANTS[environment];
const yandexMapKitApiKey = process.env.EXPO_PUBLIC_YANDEX_MAPKIT_API_KEY;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: variant.name,
  slug: 'nurtaxi-driver',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: variant.scheme,
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: variant.identifier,
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Nur Taxi показывает вашу позицию на карте и строит маршрут к клиенту.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Пока вы на линии, приложение передаёт позицию, чтобы вы получали заказы рядом с вами.',
      NSCameraUsageDescription: 'Нужна для съёмки документов и фото автомобиля.',
      NSPhotoLibraryUsageDescription: 'Нужна для загрузки документов из галереи.',
      UIBackgroundModes: ['location', 'fetch', 'remote-notification'],
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
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'CAMERA',
      'POST_NOTIFICATIONS',
      'VIBRATE',
      'WAKE_LOCK',
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
        backgroundColor: '#0B3B32',
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
          'Nur Taxi показывает вашу позицию на карте и строит маршрут к клиенту.',
        locationAlwaysAndWhenInUsePermission:
          'Пока вы на линии, приложение передаёт позицию, чтобы вы получали заказы рядом с вами.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Nur Taxi использует галерею для загрузки документов.',
        cameraPermission: 'Nur Taxi использует камеру для съёмки документов и автомобиля.',
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
        android: { compileSdkVersion: 36, targetSdkVersion: 36, minSdkVersion: 26 },
        ios: { deploymentTarget: '16.4' },
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG ?? 'nurtaxi',
        project: process.env.SENTRY_PROJECT ?? 'nurtaxi-driver',
      },
    ],
    [
      'expo-yandex-mapkit',
      {
        apiKey: yandexMapKitApiKey,
        locale: 'ru_RU',
        // `full` вместо `lite`: подсказки адресов, геокодинг и построение маршрута
        // живут только в полной сборке MapKit. На `lite` нативные модули есть, но
        // их методы отклоняются с «requires the full flavor».
        flavor: 'full',
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
    sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    requestTimeoutMs: Number(process.env.EXPO_PUBLIC_REQUEST_TIMEOUT_MS ?? 15000),
    debugNetwork: process.env.EXPO_PUBLIC_DEBUG_NETWORK === 'true',
    yandexMapKitApiKeyConfigured: Boolean(yandexMapKitApiKey),
    eas: {
      projectId: process.env.EAS_PROJECT_ID ?? 'cec4ade8-f19d-4bf6-ac74-611942753ffd',
    },
  },

  owner: process.env.EAS_OWNER ?? 'abuingush',
  updates: {
    url: process.env.EAS_UPDATE_URL ?? 'https://u.expo.dev/cec4ade8-f19d-4bf6-ac74-611942753ffd',
  },
  runtimeVersion: { policy: 'appVersion' },
});
