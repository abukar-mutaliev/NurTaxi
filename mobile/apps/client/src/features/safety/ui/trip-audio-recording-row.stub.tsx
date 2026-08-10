import { useTranslation } from 'react-i18next';

import { SafetyFeatureRow } from './safety-feature-row';

export interface TripAudioRecordingRowStubProps {
  onPress: () => void;
}

/** Заглушка, пока в текущей сборке нет нативного модуля `ExpoAudio`. */
export function TripAudioRecordingRowStub({ onPress }: TripAudioRecordingRowStubProps) {
  const { t } = useTranslation();

  return (
    <SafetyFeatureRow
      onPress={onPress}
      subtitle={t('safety.audioRequiresRebuild')}
      title={t('safety.audioTitle')}
    />
  );
}
