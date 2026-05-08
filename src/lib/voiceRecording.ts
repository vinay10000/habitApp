import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";

export type RecordedAudio = {
  uri: string;
  base64: string;
  mimeType: string;
};

export type RecordingStatus = {
  durationMillis: number;
  metering: number;
  isRecording: boolean;
};

let recording: Audio.Recording | null = null;

function mimeTypeForUri(uri: string) {
  const normalized = uri.toLowerCase();

  if (normalized.endsWith(".aac")) {
    return "audio/aac";
  }

  if (normalized.endsWith(".wav")) {
    return "audio/wav";
  }

  if (normalized.endsWith(".m4a") || normalized.endsWith(".mp4")) {
    return "audio/mp4";
  }

  return "audio/mp4";
}

export async function startAndroidVoiceRecording() {
  if (Platform.OS !== "android") {
    throw new Error("Voice recording is configured for Android only.");
  }

  const permission = await Audio.requestPermissionsAsync();

  if (!permission.granted) {
    throw new Error("Microphone permission is required for voice commands.");
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    staysActiveInBackground: false
  });

  recording = new Audio.Recording();
  await recording.prepareToRecordAsync({
    ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
    android: {
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android
    },
    isMeteringEnabled: true
  });
  await recording.startAsync();
}

export async function stopAndroidVoiceRecording(): Promise<RecordedAudio> {
  if (!recording) {
    throw new Error("No active recording.");
  }

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  recording = null;

  if (!uri) {
    throw new Error("Recording did not produce an audio file.");
  }

  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });

  return {
    uri,
    base64,
    mimeType: mimeTypeForUri(uri)
  };
}

export async function getAndroidRecordingStatus(): Promise<RecordingStatus> {
  if (!recording) {
    return { durationMillis: 0, metering: -160, isRecording: false };
  }

  const status = await recording.getStatusAsync();

  return {
    durationMillis: status.durationMillis ?? 0,
    metering: typeof status.metering === "number" ? status.metering : -160,
    isRecording: status.isRecording
  };
}

export function isRecordingActive() {
  return Boolean(recording);
}
