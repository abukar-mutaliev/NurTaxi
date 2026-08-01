/**
 * Мониторинг сети и восстановление WebSocket после reconnect (M5.5).
 */
import { useEffect, useRef } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { useSelector } from 'react-redux';

import { useSharedDispatch } from '@nurtaxi/shared-core/shared/lib';
import { selectIsAuthenticated } from '@nurtaxi/shared-core/entities/session';
import { realtimeClient } from '@nurtaxi/shared-core/features/realtime';

import { networkStatusChanged } from './network.slice';

function toNetworkPayload(state: NetInfoState): {
  isConnected: boolean;
  isInternetReachable: boolean | null;
} {
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable ?? null,
  };
}

/** Следит за NetInfo и переподключает realtime при возвращении сети. */
export function useNetworkMonitor(): void {
  const dispatch = useSharedDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const wasConnectedRef = useRef(true);
  const isAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  });

  useEffect(() => {
    void NetInfo.fetch().then((state) => {
      const payload = toNetworkPayload(state);
      wasConnectedRef.current = payload.isConnected;
      dispatch(networkStatusChanged(payload));
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const payload = toNetworkPayload(state);
      dispatch(networkStatusChanged(payload));

      if (!wasConnectedRef.current && payload.isConnected && isAuthenticatedRef.current) {
        realtimeClient.connect();
      }

      wasConnectedRef.current = payload.isConnected;
    });

    return unsubscribe;
  }, [dispatch]);
}
