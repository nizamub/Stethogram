import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine } from '@/infrastructure/audio/AudioEngine';
import { INPUT_SAMPLES } from '@/config/constants';

/**
 * Hook to manage audio capture and playback.
 * 
 * @param onBufferReady Callback when a full buffer (40k samples / 2.5s) is ready.
 * @param onChunkReady Callback when an individual PCM chunk is received (~4096 samples).
 * @returns Audio engine state and control methods.
 */
export function useAudioEngine(
  onBufferReady?: (buffer: Float32Array) => void,
  onChunkReady?: (chunk: Float32Array) => void
) {
  const [isListening, setIsListening] = useState(false);
  const [isPlaybackEnabled, setIsPlaybackEnabled] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [inputDevices, setInputDevices] = useState<Array<{ deviceId: string; label: string; isDefault: boolean }>>([
    { deviceId: '', label: 'Default Microphone', isDefault: true }
  ]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const engineRef = useRef<AudioEngine | null>(null);
  const bufferRef = useRef<Float32Array>(new Float32Array(INPUT_SAMPLES));
  const bufferIndexRef = useRef(0);

  const onBufferReadyRef = useRef(onBufferReady);
  useEffect(() => {
    onBufferReadyRef.current = onBufferReady;
  }, [onBufferReady]);

  const onChunkReadyRef = useRef(onChunkReady);
  useEffect(() => {
    onChunkReadyRef.current = onChunkReady;
  }, [onChunkReady]);

  const handleDeviceChange = useCallback(async () => {
    try {
      const devices = await AudioEngine.getInputDevices();
      setInputDevices(devices);
      if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating devices', err);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    handleDeviceChange();
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [handleDeviceChange]);

  const selectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const requestPermission = async () => {
    setError(null);
    const granted = await AudioEngine.requestPermission();
    if (granted) {
      await handleDeviceChange();
    } else {
      setError('Microphone permission was denied. Please allow microphone access in your browser settings.');
    }
  };

  const startListening = async () => {
    try {
      setError(null);
      const engine = new AudioEngine();
      engineRef.current = engine;
      bufferIndexRef.current = 0;
      bufferRef.current = new Float32Array(INPUT_SAMPLES);

      // Synchronously unlock AudioContext within the user's tap gesture
      engine.initContext();

      await engine.start(
        (chunk: Float32Array) => {
          // Stream raw chunks to listeners (visualization & recorder)
          if (onChunkReadyRef.current) {
            onChunkReadyRef.current(chunk);
          }

          // Accumulate for 2.5s classification window
          const remaining = INPUT_SAMPLES - bufferIndexRef.current;
          const toCopy = Math.min(chunk.length, remaining);
          
          bufferRef.current.set(chunk.subarray(0, toCopy), bufferIndexRef.current);
          bufferIndexRef.current += toCopy;
          
          if (bufferIndexRef.current >= INPUT_SAMPLES) {
            if (onBufferReadyRef.current) {
              onBufferReadyRef.current(new Float32Array(bufferRef.current));
            }
            bufferIndexRef.current = 0;
          }
        },
        (amp: number) => {
          setAmplitude(amp);
        },
        selectedDeviceId || undefined
      );

      setIsListening(true);
      // Immediately refresh device list now that mic permission is granted
      await handleDeviceChange();
    } catch (err: any) {
      console.error('Failed to start listening:', err);
      let errorMsg = 'Failed to access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone permission denied. Please click the lock or camera/mic icon in your browser URL bar to allow microphone access.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No physical microphone was detected on this device. Please connect a microphone or headset.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      setIsListening(false);
    }
  };

  const stopListening = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    setIsListening(false);
    setAmplitude(0);
  }, []);

  const togglePlayback = () => {
    if (engineRef.current) {
      const newPlaybackState = !isPlaybackEnabled;
      engineRef.current.setPlaybackEnabled(newPlaybackState);
      setIsPlaybackEnabled(newPlaybackState);
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isPlaybackEnabled,
    amplitude,
    inputDevices,
    selectedDeviceId,
    error,
    startListening,
    stopListening,
    togglePlayback,
    selectDevice,
    requestPermission
  };
}
