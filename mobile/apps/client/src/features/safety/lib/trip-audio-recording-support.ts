import { requireOptionalNativeModule } from 'expo-modules-core';

/** `expo-audio` доступен только в dev-сборке с нативным модулем ExpoAudio. */
export function isTripAudioRecordingAvailable(): boolean {
  return requireOptionalNativeModule('ExpoAudio') != null;
}
