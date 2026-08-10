import { useEffect, useState } from 'react';

import { appConfig } from '../../../shared/config';

import { hasMapKitApiKey, hasNativeMapModule } from '../model/map-provider';

export interface MapKitInitState {
  isReady: boolean;
  failed: boolean;
}

/**
 * Yandex MapKit должен быть инициализирован до первого рендера карты.
 * Build-time ключ из config plugin покрывает не все dev-сборки — дублируем runtime init.
 */
export function useMapKitInit(): MapKitInitState {
  const canInitialize = hasMapKitApiKey() && hasNativeMapModule();
  const [isReady, setIsReady] = useState(!canInitialize);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!canInitialize) {
      return;
    }

    // `canInitialize` уже требует `hasMapKitApiKey()` (Boolean(appConfig.yandexMapKitApiKey)),
    // так что ключ на этом шаге гарантированно есть — проверка здесь только для TypeScript.
    const apiKey = appConfig.yandexMapKitApiKey;
    if (!apiKey) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { initialize } = await import('expo-yandex-mapkit');
        await initialize(apiKey);
        if (!cancelled) {
          setIsReady(true);
        }
      } catch (error) {
        console.warn('[map] MapKit initialize failed', error);
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canInitialize]);

  return { isReady, failed };
}
