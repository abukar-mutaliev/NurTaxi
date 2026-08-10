import { isTripAudioRecordingAvailable } from '../lib/trip-audio-recording-support';
import type {
  TripAudioRecordingDialogState,
  TripAudioRecordingHandlers,
} from '../model/trip-audio-recording.types';
import { TripAudioRecordingRowStub } from './trip-audio-recording-row.stub';

export interface TripAudioRecordingRowProps {
  orderId: string | null;
  canRecord: boolean;
  onStubPress: () => void;
  onDialog: (dialog: TripAudioRecordingDialogState) => void;
  onBindHandlers: (handlers: TripAudioRecordingHandlers) => void;
  onUploadingChange: (isUploading: boolean) => void;
}

export function TripAudioRecordingRow({
  orderId,
  canRecord,
  onStubPress,
  onDialog,
  onBindHandlers,
  onUploadingChange,
}: TripAudioRecordingRowProps) {
  if (!isTripAudioRecordingAvailable()) {
    return <TripAudioRecordingRowStub onPress={onStubPress} />;
  }

  const { TripAudioRecordingRowImpl } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy native module
    require('./trip-audio-recording-row.impl') as typeof import('./trip-audio-recording-row.impl');

  return (
    <TripAudioRecordingRowImpl
      canRecord={canRecord}
      onBindHandlers={onBindHandlers}
      onDialog={onDialog}
      onUploadingChange={onUploadingChange}
      orderId={orderId}
    />
  );
}
