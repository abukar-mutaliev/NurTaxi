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

jest.mock('expo-yandex-mapkit', () => {
  const React = require('react');
  const { View } = require('react-native');

  const YandexMapView = React.forwardRef(function MockYandexMapView(props, ref) {
    React.useImperativeHandle(ref, () => ({
      setCenter: jest.fn(async () => undefined),
      fitMarkers: jest.fn(async () => undefined),
    }));
    return React.createElement(View, props);
  });

  const Marker = ({ children }) => React.createElement(View, null, children);
  const Polyline = () => React.createElement(View);

  return {
    __esModule: true,
    YandexMapView,
    Marker,
    Polyline,
    initialize: jest.fn(async () => undefined),
  };
});
