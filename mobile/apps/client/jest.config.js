// Unit и компонентные тесты (M11.1, M11.2).
const path = require('node:path');

const sharedCore = path.resolve(__dirname, '../../packages/shared-core');

/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@nurtaxi/shared-core$': `${sharedCore}/index.ts`,
    '^@nurtaxi/shared-core/(.*)$': `${sharedCore}/$1`,
  },
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|expo-yandex-mapkit|socket.io-client|engine.io-client|@reduxjs/toolkit|redux-persist))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/index.ts', '!src/**/*.d.ts'],
};
