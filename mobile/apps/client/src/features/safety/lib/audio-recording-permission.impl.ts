import { AudioModule } from 'expo-audio';

export interface AudioRecordingPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
}

async function readPermission(): Promise<AudioRecordingPermissionStatus> {
  const result = await AudioModule.getRecordingPermissionsAsync();

  return {
    granted: result.granted,
    canAskAgain: result.canAskAgain ?? true,
  };
}

async function askPermission(): Promise<AudioRecordingPermissionStatus> {
  const result = await AudioModule.requestRecordingPermissionsAsync();

  return {
    granted: result.granted,
    canAskAgain: result.canAskAgain ?? true,
  };
}

export async function ensureAudioRecordingPermission(): Promise<AudioRecordingPermissionStatus> {
  const current = await readPermission();
  if (current.granted) {
    return current;
  }

  if (!current.canAskAgain) {
    return current;
  }

  return askPermission();
}
