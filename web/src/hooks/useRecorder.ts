import { useState, useRef, useCallback, useEffect } from 'react';
import { encodeWAV, downloadWAV } from '@/domain/audio/wavEncoder';
import { TARGET_SAMPLE_RATE } from '@/config/constants';

/**
 * Hook to manage audio recording.
 * 
 * @param onRecordingComplete Callback when a recording is stopped and exported.
 * @returns Recorder state and methods.
 */
export function useRecorder(onRecordingComplete?: (buffer: Float32Array) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recordedChunks = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);

  const onRecordingCompleteRef = useRef(onRecordingComplete);
  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
  }, [onRecordingComplete]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = window.setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const addChunk = useCallback((chunk: Float32Array) => {
    if (isRecording) {
      recordedChunks.current.push(new Float32Array(chunk));
    }
  }, [isRecording]);

  const startRecording = useCallback(() => {
    recordedChunks.current = [];
    setDuration(0);
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(async () => {
    setIsRecording(false);
    
    if (recordedChunks.current.length === 0) return;
    
    // Calculate total length
    const totalLength = recordedChunks.current.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedBuffer = new Float32Array(totalLength);
    
    let offset = 0;
    for (const chunk of recordedChunks.current) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    try {
      const wavBlob = await encodeWAV(combinedBuffer, TARGET_SAMPLE_RATE);
      const dateStr = new Date().toISOString().replace(/T/, '-').replace(/:/g, '-').split('.')[0];
      downloadWAV(wavBlob, `stethogram-${dateStr}.wav`);

      // Trigger automatic classification of the finished recording
      if (onRecordingCompleteRef.current) {
        onRecordingCompleteRef.current(combinedBuffer);
      }
    } catch (err) {
      console.error('Failed to save WAV:', err);
    }
  }, []);

  return {
    isRecording,
    duration,
    recordedChunks: recordedChunks.current,
    startRecording,
    stopRecording,
    addChunk
  };
}
