/**
 * Аудиозапись поездки: запись через expo-audio и загрузка в S3 через presign → PUT → confirm.
 * Файл без суффикса `.native` — подключается только через runtime `require()`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

import { toAppError } from '@nurtaxi/shared-core/shared/api';
import {
  useConfirmTripRecordingMutation,
  usePresignTripRecordingMutation,
} from '@nurtaxi/shared-core/entities/order';

import { ensureAudioRecordingPermission } from '../lib/audio-recording-permission.impl';

import type { TripAudioRecordingPhase } from './trip-audio-recording.types';

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  directory: 'document' as const,
};

export function useTripAudioRecording(orderId: string | null, canRecord: boolean) {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<TripAudioRecordingPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const uploadInFlightRef = useRef(false);
  const [presignRecording] = usePresignTripRecordingMutation();
  const [confirmRecording] = useConfirmTripRecordingMutation();

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });
  }, []);

  useEffect(() => {
    setPhase('idle');
    setError(null);
    setPermissionBlocked(false);
    startedAtRef.current = null;
  }, [orderId]);

  const uploadRecording = useCallback(
    async (uri: string, durationSec: number) => {
      if (!orderId || uploadInFlightRef.current) {
        return;
      }

      uploadInFlightRef.current = true;
      setPhase('uploading');
      setError(null);

      try {
        const contentType = 'audio/mp4';
        const { uploadUrl, storageKey } = await presignRecording({
          orderId,
          contentType,
          fileName: 'trip-recording.m4a',
        }).unwrap();

        const upload = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: { 'Content-Type': contentType },
        });

        if (upload.status < 200 || upload.status >= 300) {
          throw new Error(`Upload failed (${upload.status})`);
        }

        await confirmRecording({ orderId, storageKey, durationSec }).unwrap();
        setPhase('saved');
      } catch (cause) {
        setError(toAppError(cause as never).message);
        setPhase('idle');
      } finally {
        uploadInFlightRef.current = false;
      }
    },
    [confirmRecording, orderId, presignRecording],
  );

  const stopRecording = useCallback(async () => {
    if (!recorderState.isRecording) {
      return;
    }

    const elapsedSec = startedAtRef.current
      ? Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      : Math.max(1, Math.round(recorderState.durationMillis / 1000));

    await recorder.stop();
    startedAtRef.current = null;

    const uri = recorder.uri;
    if (uri && orderId) {
      await uploadRecording(uri, elapsedSec);
      return;
    }

    setPhase('idle');
  }, [orderId, recorder, recorderState.durationMillis, recorderState.isRecording, uploadRecording]);

  const startRecording = useCallback(async () => {
    if (!orderId || !canRecord || phase === 'uploading') {
      return false;
    }

    setError(null);
    const permission = await ensureAudioRecordingPermission();
    if (!permission.granted) {
      setPermissionBlocked(!permission.canAskAgain);
      return false;
    }

    setPermissionBlocked(false);
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAtRef.current = Date.now();
    setPhase('recording');
    return true;
  }, [canRecord, orderId, phase, recorder]);

  useEffect(() => {
    if (phase === 'recording' && !canRecord) {
      void stopRecording();
    }
  }, [canRecord, phase, stopRecording]);

  const elapsedSec = Math.floor(recorderState.durationMillis / 1000);

  return {
    phase,
    isRecording: phase === 'recording' && recorderState.isRecording,
    elapsedSec,
    error,
    permissionBlocked,
    clearError: () => setError(null),
    clearPermissionBlocked: () => setPermissionBlocked(false),
    startRecording,
    stopRecording,
  };
}
