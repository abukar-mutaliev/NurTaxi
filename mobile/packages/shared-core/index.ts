/**
 * Публичный API пакета `@nurtaxi/shared-core`.
 *
 * Предпочтительнее импортировать из конкретного слоя — так ESLint-правила границ FSD
 * проверяют направление зависимостей:
 *   `@nurtaxi/shared-core/shared`, `@nurtaxi/shared-core/entities`,
 *   `@nurtaxi/shared-core/features` (и глубже, например `.../entities/order`).
 */
export * from './shared';
export * from './entities';
export * from './features';
export * from './widgets';
