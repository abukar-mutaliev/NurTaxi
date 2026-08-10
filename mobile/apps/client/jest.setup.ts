/**
 * Общие моки для тестов. Нативные модули не работают в Node, поэтому заменяем их
 * минимальными реализациями с теми же контрактами.
 */
jest.mock('expo-secure-store', () => ({
  __esModule: true,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlockedThisDeviceOnly',
  setItemAsync: jest.fn(async () => undefined),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-localization', () => ({
  __esModule: true,
  getLocales: () => [{ languageCode: 'ru', languageTag: 'ru-RU' }],
}));

jest.mock('socket.io-client', () => ({
  __esModule: true,
  io: jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    removeAllListeners: jest.fn(),
    io: { on: jest.fn() },
    connected: false,
  })),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        environment: 'development',
        apiUrl: 'http://localhost:3000/api/v1',
        requestTimeoutMs: 15000,
        debugNetwork: false,
        yandexMapKitApiKeyConfigured: true,
      },
    },
  },
}));

jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual<typeof import('expo-modules-core')>('expo-modules-core');
  return {
    ...actual,
    requireOptionalNativeModule: (name: string) =>
      name === 'ExpoYandexMapKit' ? {} : actual.requireOptionalNativeModule(name),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(async () => ({ isConnected: true, isInternetReachable: true })),
    addEventListener: jest.fn(() => jest.fn()),
  },
}));

jest.mock('expo-notifications', () => ({
  __esModule: true,
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  AndroidImportance: { MAX: 5, DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', canAskAgain: true })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
}));

jest.mock('expo-device', () => ({
  __esModule: true,
  isDevice: true,
}));

jest.mock('expo-audio', () => ({
  __esModule: true,
  RecordingPresets: { HIGH_QUALITY: { extension: '.m4a' } },
  setAudioModeAsync: jest.fn(async () => undefined),
  useAudioRecorder: jest.fn(() => ({
    prepareToRecordAsync: jest.fn(async () => undefined),
    record: jest.fn(),
    stop: jest.fn(async () => undefined),
    uri: 'file:///mock-recording.m4a',
  })),
  useAudioRecorderState: jest.fn(() => ({
    isRecording: false,
    durationMillis: 0,
  })),
  AudioModule: {
    getRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    requestRecordingPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  },
}));

jest.mock('expo-yandex-mapkit', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  const YandexMapView = React.forwardRef(function MockYandexMapView(
    props: Record<string, unknown>,
    ref: unknown,
  ) {
    React.useImperativeHandle(ref, () => ({
      setCenter: jest.fn(async () => undefined),
      fitMarkers: jest.fn(async () => undefined),
    }));
    return React.createElement(View, props);
  });

  const Marker = ({ children }: { children?: unknown }) =>
    React.createElement(View, null, children);
  const Polyline = () => React.createElement(View);

  return {
    __esModule: true,
    YandexMapView,
    Marker,
    Polyline,
    initialize: jest.fn(async () => undefined),
  };
});
