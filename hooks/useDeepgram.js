import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Platform-specific audio config
// ---------------------------------------------------------------------------
// iOS  → WAV (LINEARPCM), skip 44-byte header, Deepgram encoding: linear16
// Android → AMR-WB (.amr), skip 9-byte header, Deepgram encoding: amr-wb
// AMR-WB is natively supported by Android's MediaRecorder and by Deepgram's
// streaming API.
// ---------------------------------------------------------------------------

const PLATFORM = Platform.OS;

const RECORDING_OPTIONS = {
  isMeteringEnabled: false,
  android: {
    extension: '.amr',
    outputFormat: Audio.AndroidOutputFormat.AMR_WB,
    audioEncoder: Audio.AndroidAudioEncoder.AMR_WB,
    sampleRate: 16000,
    numberOfChannels: 1,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

// Number of bytes to skip at the start of the audio file (file header).
// WAV header = 44 bytes, AMR-WB header = 9 bytes ("#!AMR-WB\n").
const HEADER_BYTES = PLATFORM === 'ios' ? 44 : 9;

// Deepgram encoding string matching the recorded format.
const DEEPGRAM_ENCODING = PLATFORM === 'ios' ? 'linear16' : 'amr-wb';

const CHUNK_INTERVAL_MS = 250;

/**
 * @param {object} opts
 * @param {(text: string) => void} opts.onFinalTranscript   - called for final Deepgram results
 * @param {(text: string) => void} opts.onInterimTranscript - called for interim Deepgram results
 * @param {(err: Error)  => void}  [opts.onError]           - optional error handler
 */
export function useDeepgram({ onFinalTranscript, onInterimTranscript, onError } = {}) {
  const [isRecording, setIsRecording] = useState(false);

  const wsRef        = useRef(null);
  const recordingRef = useRef(null);
  const intervalRef  = useRef(null);
  const bytesReadRef = useRef(0);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (wsRef.current) {
      try { wsRef.current.close(); } catch (_) {}
      wsRef.current = null;
    }
    bytesReadRef.current = 0;
  }, []);

  const handleError = useCallback((err) => {
    console.error('[useDeepgram]', err);
    onError?.(err instanceof Error ? err : new Error(String(err)));
    cleanup();
    setIsRecording(false);
  }, [cleanup, onError]);

  // ------------------------------------------------------------------
  // Send buffered audio to Deepgram
  // ------------------------------------------------------------------

  const sendNextChunk = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) return;

    const uri = recording.getURI();
    if (!uri) return;

    try {
      const info = await FileSystem.getInfoAsync(uri, { size: true });
      if (!info.exists || !info.size) return;

      // On the very first read, skip the audio file header.
      if (bytesReadRef.current === 0) {
        bytesReadRef.current = HEADER_BYTES;
      }

      const available = info.size - bytesReadRef.current;
      if (available <= 0) return;

      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        position: bytesReadRef.current,
        length: available,
      });
      bytesReadRef.current += available;

      if (!b64 || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

      // Decode base64 → Uint8Array and send as binary over the WebSocket.
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      wsRef.current.send(bytes.buffer);
    } catch (err) {
      // Non-fatal: the file may not be ready yet on the first tick.
      console.warn('[useDeepgram] chunk error:', err?.message);
    }
  }, []);

  // ------------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------------

  const startRecording = useCallback(async () => {
    try {
      // Microphone permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission not granted.');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Read API key via expo-constants (injected through app.config.js extra)
      const apiKey = Constants.expoConfig?.extra?.deepgramApiKey ?? '';
      if (!apiKey) {
        throw new Error('DEEPGRAM_API_KEY is not set. Add it to .env.local and rebuild the APK.');
      }

      // Open Deepgram streaming WebSocket.
      // Auth via token query param — Android's React Native WebSocket does NOT
      // reliably forward custom headers, so Authorization header is unreliable.
      // Deepgram supports token auth in the URL for WebSocket connections.
      const wsUrl =
        `wss://api.deepgram.com/v1/listen` +
        `?model=nova-2` +
        `&encoding=${DEEPGRAM_ENCODING}` +
        `&sample_rate=16000` +
        `&channels=1` +
        `&interim_results=true` +
        `&punctuate=false` +  // we handle punctuation via voice commands
        `&token=${apiKey}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useDeepgram] WebSocket open');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'Results') return;

          const alt = data.channel?.alternatives?.[0];
          const transcript = alt?.transcript?.trim() ?? '';
          if (!transcript) return;

          if (data.is_final) {
            onFinalTranscript?.(transcript);
          } else {
            onInterimTranscript?.(transcript);
          }
        } catch (err) {
          console.warn('[useDeepgram] message parse error:', err?.message);
        }
      };

      ws.onerror = (event) => {
        // onerror on Android rarely carries a useful message; onclose fires
        // right after with the actual code and reason, so we log here only.
        console.warn('[useDeepgram] WebSocket error event', event.message);
      };

      ws.onclose = (event) => {
        console.log('[useDeepgram] WebSocket closed', event.code, event.reason);
        // Only surface as an error if recording was still active (not a
        // deliberate stop) and it wasn't a clean close (code 1000).
        if (recordingRef.current && event.code !== 1000) {
          const reason = event.reason
            ? `${event.code}: ${event.reason}`
            : `WebSocket closed (code ${event.code})`;
          handleError(new Error(reason));
        }
      };

      // Start audio recording
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();
      recordingRef.current = recording;
      bytesReadRef.current = 0;

      // Poll and stream audio chunks every CHUNK_INTERVAL_MS
      intervalRef.current = setInterval(sendNextChunk, CHUNK_INTERVAL_MS);

      setIsRecording(true);
    } catch (err) {
      handleError(err);
    }
  }, [sendNextChunk, handleError]);

    const stopRecording = useCallback(async () => {
        // Tell Deepgram to flush any buffered audio before closing
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'CloseStream' }));
        }

        cleanup();

        const recording = recordingRef.current;
        recordingRef.current = null;

        if (recording) {
            try {
                await recording.stopAndUnloadAsync();
            } catch (err) {
                console.warn('[useDeepgram] stop error:', err?.message);
            }
        }

        await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
        setIsRecording(false);
    }, [cleanup]);

  return { isRecording, startRecording, stopRecording };
}
