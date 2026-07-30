import { useEffect, useMemo, useRef } from 'react';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatCountdown } from '@nurtaxi/shared-core/shared/lib';

import { SafetyFeatureRow } from './safety-feature-row';

import type {
  TripAudioRecordingDialogState,
  TripAudioRecordingHandlers,
} from '../model/trip-audio-recording.types';
import { useTripAudioRecording } from '../model/use-trip-audio-recording.impl';

export interface TripAudioRecordingRowImplProps {
  orderId: string | null;
  canRecord: boolean;
  onDialog: (dialog: TripAudioRecordingDialogState) => void;
  onBindHandlers: (handlers: TripAudioRecordingHandlers) => void;
  onUploadingChange: (isUploading: boolean) => void;
}

export function TripAudioRecordingRowImpl({
  orderId,
  canRecord,
  onDialog,
  onBindHandlers,
  onUploadingChange,
}: TripAudioRecordingRowImplProps) {
  const { t } = useTranslation();
  const audioRecording = useTripAudioRecording(orderId, canRecord);
  const savedDialogShownRef = useRef(false);

  const audioSubtitle = useMemo(() => {
    if (audioRecording.phase === 'recording') {
      return t('safety.audioRecording', {
        time: formatCountdown(audioRecording.elapsedSec),
      });
    }
    if (audioRecording.phase === 'uploading') {
      return t('safety.audioUploading');
    }
    if (audioRecording.phase === 'saved') {
      return t('safety.audioSaved');
    }
    return t('safety.audioSubtitle');
  }, [audioRecording.elapsedSec, audioRecording.phase, t]);

  useEffect(() => {
    onBindHandlers({
      confirmStopRecording: () => {
        void audioRecording.stopRecording();
      },
      openSettings: () => {
        void Linking.openSettings();
        audioRecording.clearPermissionBlocked();
      },
      clearError: () => {
        audioRecording.clearError();
      },
    });
  }, [audioRecording, onBindHandlers]);

  useEffect(() => {
    onUploadingChange(audioRecording.phase === 'uploading');
  }, [audioRecording.phase, onUploadingChange]);

  useEffect(() => {
    if (audioRecording.phase === 'saved' && !savedDialogShownRef.current) {
      savedDialogShownRef.current = true;
      onDialog({ kind: 'audioSaved' });
    }

    if (audioRecording.phase === 'idle' || audioRecording.phase === 'recording') {
      savedDialogShownRef.current = false;
    }
  }, [audioRecording.phase, onDialog]);

  useEffect(() => {
    if (audioRecording.error) {
      onDialog({ kind: 'error', message: audioRecording.error });
    }
  }, [audioRecording.error, onDialog]);

  const handlePress = async () => {
    if (!orderId || !canRecord) {
      onDialog({ kind: 'audioOutsideTrip' });
      return;
    }

    if (audioRecording.phase === 'uploading') {
      return;
    }

    if (audioRecording.isRecording) {
      onDialog({ kind: 'audioStopConfirm' });
      return;
    }

    const started = await audioRecording.startRecording();
    if (!started && audioRecording.permissionBlocked) {
      onDialog({ kind: 'audioPermission' });
    }
  };

  return (
    <SafetyFeatureRow
      active={audioRecording.isRecording}
      disabled={audioRecording.phase === 'uploading'}
      loading={audioRecording.phase === 'uploading'}
      onPress={() => {
        void handlePress();
      }}
      subtitle={audioSubtitle}
      title={t('safety.audioTitle')}
    />
  );
}
