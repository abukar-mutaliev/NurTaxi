// Единая конфигурация ESLint для монорепозитория мобильных приложений (M0.2).
// Помимо базовых правил Expo здесь описаны архитектурные границы Feature-Sliced Design:
// импорт разрешён только «вниз» по слоям app → processes → screens → widgets → features →
// entities → shared. Слой `routes` — тонкие файлы Expo Router, они делегируют в `screens`.
import expoConfig from 'eslint-config-expo/flat.js';
import prettierConfig from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import tseslint from 'typescript-eslint';

/** Слои FSD от старшего к младшему. */
const LAYERS = [
  'routes',
  'app',
  'processes',
  'screens',
  'widgets',
  'features',
  'entities',
  'shared',
];

/** Слои переиспользуемого пакета shared-core (FSD-lite). */
const CORE_LAYERS = ['core-widgets', 'core-features', 'core-entities', 'core-shared'];

/**
 * Слои, доступные откуда угодно: `store` — типизированные хуки Redux (инфраструктура, а не
 * бизнес-логика), `processes` — состояние сквозных сценариев, к которому обращаются экраны.
 */
const AMBIENT_LAYERS = ['store', 'processes'];

/**
 * Слой может импортировать соседние срезы своего слоя, все слои строго ниже себя,
 * слои shared-core и «сквозные» слои.
 */
function allowedFrom(layer) {
  const index = LAYERS.indexOf(layer);
  const lower = LAYERS.slice(index + 1);
  return [...new Set([layer, ...lower, ...CORE_LAYERS, ...AMBIENT_LAYERS])];
}

const elementTypesRules = [
  ...LAYERS.map((layer) => ({ from: [layer], allow: allowedFrom(layer) })),
  // Store собирает редьюсеры процессов и сущностей, но ничего не знает об экранах.
  { from: ['store'], allow: ['store', 'processes', 'entities', 'shared', ...CORE_LAYERS] },
];

const coreElementTypesRules = [
  { from: ['core-widgets'], allow: ['core-widgets', 'core-shared'] },
  { from: ['core-features'], allow: ['core-features', 'core-entities', 'core-shared'] },
  { from: ['core-entities'], allow: ['core-entities', 'core-shared'] },
  { from: ['core-shared'], allow: ['core-shared'] },
];

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.expo/**',
      '**/dist/**',
      '**/build/**',
      '**/android/**',
      '**/ios/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/expo-env.d.ts',
    ],
  },
  ...expoConfig,
  {
    plugins: { boundaries, '@typescript-eslint': tseslint.plugin },
    settings: {
      // Псевдонимы `@/*` у каждого приложения свои, поэтому резолверу нужны все tsconfig'и.
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          noWarnOnMultipleProjects: true,
          project: ['apps/*/tsconfig.json', 'packages/*/tsconfig.json'],
        },
      },
      'boundaries/include': ['apps/*/app/**/*', 'apps/*/src/**/*', 'packages/shared-core/**/*'],
      'boundaries/elements': [
        { type: 'routes', pattern: 'apps/*/app/**/*', mode: 'file' },
        // Порядок важен: первый подходящий шаблон выигрывает, поэтому store — до app.
        { type: 'store', pattern: 'apps/*/src/app/store/**/*', mode: 'file' },
        { type: 'app', pattern: 'apps/*/src/app/**/*', mode: 'file' },
        { type: 'processes', pattern: 'apps/*/src/processes/**/*', mode: 'file' },
        { type: 'screens', pattern: 'apps/*/src/screens/**/*', mode: 'file' },
        { type: 'widgets', pattern: 'apps/*/src/widgets/**/*', mode: 'file' },
        { type: 'features', pattern: 'apps/*/src/features/**/*', mode: 'file' },
        { type: 'entities', pattern: 'apps/*/src/entities/**/*', mode: 'file' },
        { type: 'shared', pattern: 'apps/*/src/shared/**/*', mode: 'file' },
        { type: 'core-features', pattern: 'packages/shared-core/features/**/*', mode: 'file' },
        { type: 'core-entities', pattern: 'packages/shared-core/entities/**/*', mode: 'file' },
        { type: 'core-widgets', pattern: 'packages/shared-core/widgets/**/*', mode: 'file' },
        { type: 'core-shared', pattern: 'packages/shared-core/shared/**/*', mode: 'file' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [...elementTypesRules, ...coreElementTypesRules],
        },
      ],
      'boundaries/no-private': 'off',
      'boundaries/no-unknown': 'off',
      'boundaries/no-unknown-files': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // В проекте принят идиом `const X = {...} as const` + одноимённый `type X`:
      // так enum'ы бэкенда живут в рантайме и в типах одновременно.
      '@typescript-eslint/no-redeclare': 'off',
      // Ложные срабатывания на default-экспортах i18next и typescript-eslint.
      'import/no-named-as-default-member': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'import/no-default-export': 'off',
    },
  },
  {
    // Expo Router требует default export в файлах маршрутов.
    files: ['apps/*/app/**/*.tsx', 'apps/*/*.config.ts', 'apps/*/*.config.js'],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    // Служебные скрипты пишут в stdout — это их основной способ общения с разработчиком.
    files: ['scripts/**/*'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**/*'],
    rules: { 'boundaries/element-types': 'off' },
  },
  prettierConfig,
];
