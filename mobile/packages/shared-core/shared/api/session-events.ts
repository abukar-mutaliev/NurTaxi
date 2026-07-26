/**
 * Глобальные события сессии.
 *
 * Слой `shared` не имеет права импортировать `entities`, поэтому обратная связь
 * «сеть → состояние сессии» построена на общих action-креаторах: их создаёт `shared/api`,
 * а обрабатывает slice в `entities/session`.
 */
import { createAction } from '@reduxjs/toolkit';

import type { TokenPair } from '../model/api-types';

/** Refresh не удался — сессия недействительна, нужен повторный вход. */
export const sessionUnauthorized = createAction('session/unauthorized');

/** Токены успешно обновлены в фоне (ротация refresh-токена). */
export const sessionTokensRefreshed = createAction<TokenPair>('session/tokensRefreshed');
