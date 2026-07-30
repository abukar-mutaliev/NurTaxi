export type TripAudioRecordingPhase = 'idle' | 'recording' | 'uploading' | 'saved';

export type TripAudioRecordingDialogState =
  | { kind: 'audioOutsideTrip' }
  | { kind: 'audioStopConfirm' }
  | { kind: 'audioPermission' }
  | { kind: 'audioSaved' }
  | { kind: 'error'; message: string };

export interface TripAudioRecordingHandlers {
  confirmStopRecording: () => void;
  openSettings: () => void;
  clearError: () => void;
}
