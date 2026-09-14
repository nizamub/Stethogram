import { useState, useRef, useCallback } from 'react';

const BUFFER_SIZE = 1024;

/**
 * Hook to manage visualization data.
 * 
 * @returns Visualization state and methods.
 */
export function useVisualization() {
  const [amplitude, setAmplitude] = useState(0);
  const waveformDataRef = useRef<Float32Array>(new Float32Array(BUFFER_SIZE));

  const pushSamples = useCallback((newSamples: Float32Array) => {
    const current = waveformDataRef.current;
    
    // Shift old samples left
    if (newSamples.length >= BUFFER_SIZE) {
      current.set(newSamples.subarray(newSamples.length - BUFFER_SIZE));
    } else {
      current.copyWithin(0, newSamples.length);
      current.set(newSamples, BUFFER_SIZE - newSamples.length);
    }
    
    // Calculate simple amplitude (RMS-like) for the window
    let sum = 0;
    for (let i = 0; i < newSamples.length; i++) {
      sum += Math.abs(newSamples[i]);
    }
    const currentAmp = newSamples.length > 0 ? sum / newSamples.length : 0;
    
    // Smooth amplitude
    setAmplitude(prev => prev * 0.8 + currentAmp * 0.2);
  }, []);

  return {
    waveformData: waveformDataRef.current,
    amplitude,
    pushSamples
  };
}
