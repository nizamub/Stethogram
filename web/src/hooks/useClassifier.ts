import { useState, useEffect, useCallback, useRef } from 'react';
import { modelManager } from '@/infrastructure/ml/ModelManager';
import { preprocessAudio } from '@/domain/ml/preprocessor';
import { parseClassificationResult, ClassificationResult } from '@/domain/ml/classifier';
import {
  isValidHeartSound,
  calculateRMS,
  calculatePeakAmplitude,
  calculateZeroCrossingRate,
  calculateQualityScore,
  getQualityLevel
} from '@/domain/dsp/validation';
import {
  INPUT_SAMPLES,
  FRAME_LENGTH,
  FRAME_STEP,
  N_BINS,
  MODEL_PATH
} from '@/config/constants';
import { AudioQualityMetrics } from '@/types';

/**
 * Hook to manage ML classification pipeline.
 * 
 * @returns Classification state and methods.
 */
export function useClassifier() {
  const [modelState, setModelState] = useState<'unloaded' | 'downloading' | 'loading' | 'warming-up' | 'ready' | 'error'>('unloaded');
  const [modelLoadPercent, setModelLoadPercent] = useState(0);
  const [isClassifying, setIsClassifying] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<AudioQualityMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validCountRef = useRef(0);
  const totalCountRef = useRef(0);

  useEffect(() => {
    let isMounted = true;
    const loadModel = async () => {
      try {
        setModelState('downloading');

        await modelManager.load(MODEL_PATH, (progress) => {
          if (!isMounted) return;
          setModelLoadPercent(progress.percent);
          if (progress.state === 'downloading') {
            setModelState('downloading');
          } else if (progress.state === 'initializing') {
            setModelState('warming-up');
          } else if (progress.state === 'ready') {
            setModelState('ready');
          } else if (progress.state === 'error') {
            setModelState('error');
            setError(progress.error || 'Failed to load model');
          }
        });

        if (isMounted) {
          setModelState('ready');
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('[useClassifier] Model load error:', err);
          setError(err.message || 'Failed to load model');
          setModelState('error');
        }
      }
    };
    
    loadModel();
    return () => { isMounted = false; };
  }, []);

  const classifyBuffer = useCallback(async (pcmBuffer: Float32Array) => {
    if (modelState !== 'ready') return;
    
    setIsClassifying(true);
    try {
      // Calculate quality metrics
      const rms = calculateRMS(pcmBuffer);
      const peak = calculatePeakAmplitude(pcmBuffer);
      const zcr = calculateZeroCrossingRate(pcmBuffer);
      const isValid = isValidHeartSound(pcmBuffer);

      totalCountRef.current += 1;
      if (isValid) {
        validCountRef.current += 1;
      }

      const score = calculateQualityScore(rms, validCountRef.current, totalCountRef.current);
      const level = getQualityLevel(score);
      
      setQualityMetrics({
        rms,
        peak,
        zeroCrossingRate: zcr,
        isValid,
        score,
        level
      });
      
      // Skip only if the microphone was virtually silent / muted
      if (rms < 0.0003) {
        setIsClassifying(false);
        return;
      }
      
      const startTime = performance.now();
      const spectrogram = preprocessAudio(pcmBuffer, INPUT_SAMPLES, FRAME_LENGTH, FRAME_STEP, N_BINS);
      const probabilities = await modelManager.predict(spectrogram);
      const inferenceTimeMs = performance.now() - startTime;
      
      const parsedResult = parseClassificationResult(probabilities, inferenceTimeMs);
      console.log('[Classifier] Prediction:', parsedResult.condition, 'Confidence:', (parsedResult.confidence * 100).toFixed(1) + '%', 'Time:', inferenceTimeMs.toFixed(0) + 'ms');
      setResult(parsedResult);
      
    } catch (err: any) {
      console.error('[Classifier] Classification error:', err);
      setError(err.message || 'Classification failed');
    } finally {
      setIsClassifying(false);
    }
  }, [modelState]);

  return {
    modelState,
    modelLoadPercent,
    isClassifying,
    result,
    qualityMetrics,
    error,
    classifyBuffer
  };
}
