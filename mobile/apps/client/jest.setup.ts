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
      },
    },
  },
}));
