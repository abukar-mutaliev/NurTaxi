/**
 * Типы Redux, доступные общему коду.
 *
 * `shared-core` не знает финальную форму RootState конкретного приложения, поэтому использует
 * минимально достаточный тип dispatch: он умеет отправлять и обычные экшены, и thunk'и
 * (в частности `api.util.updateQueryData`, который нужен WebSocket-слою).
 */
import { useDispatch } from 'react-redux';
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit';

/**
 * Тип состояния намеренно оставлен `any`: thunk'и RTK Query параметризованы полным
 * RootState приложения, который общему пакету неизвестен. Сузить его здесь нельзя,
 * не сделав `shared-core` зависимым от конкретного приложения.
 */
export type SharedDispatch = ThunkDispatch<any, unknown, UnknownAction>;

export const useSharedDispatch = (): SharedDispatch => useDispatch<SharedDispatch>();
