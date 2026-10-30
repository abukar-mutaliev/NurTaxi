/** Типизированные хуки Redux — используйте только их, не голые `useDispatch`/`useSelector`. */
import { useDispatch, useSelector, useStore } from 'react-redux';

import type { AppDispatch, AppStore, RootState } from './store';

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
/** Для разового чтения состояния без подписки на его изменения. */
export const useAppStore = useStore.withTypes<AppStore>();
