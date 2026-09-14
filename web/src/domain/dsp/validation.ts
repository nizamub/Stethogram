import {
  RMS_THRESHOLD,
  PEAK_THRESHOLD,
  MAX_ZERO_CROSSING_RATE,
  QUALITY_WEIGHTS,
  QUALITY_RMS_CEILING,
  QUALITY_THRESHOLDS
} from '../../config/constants';

/**
 * Calculates the Root Mean Square (RMS) of audio samples.
 * @param samples The input audio samples.
 * @returns The RMS value.
 */
export function calculateRMS(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSq += samples[i] * samples[i];
  }
  return Math.sqrt(sumSq / samples.length);
}

/**
 * Calculates the peak amplitude (maximum absolute value) of audio samples.
 * @param samples The input audio samples.
 * @returns The peak amplitude.
 */
export function calculatePeakAmplitude(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const absVal = Math.abs(samples[i]);
    if (absVal > peak) {
      peak = absVal;
    }
  }
  return peak;
}

/**
 * Calculates the number of zero crossings in audio samples.
 * @param samples The input audio samples.
 * @returns The zero crossing count.
 */
export function calculateZeroCrossings(samples: Float32Array): number {
  let count = 0;
  for (let i = 1; i < samples.length; i++) {
    if ((samples[i] >= 0 && samples[i - 1] < 0) || (samples[i] < 0 && samples[i - 1] >= 0)) {
      count++;
    }
  }
  return count;
}

/**
 * Calculates the zero crossing rate of audio samples.
 * @param samples The input audio samples.
 * @returns The zero crossing rate.
 */
export function calculateZeroCrossingRate(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  return calculateZeroCrossings(samples) / samples.length;
}

/**
 * Validates if the given samples represent a valid heart sound.
 * @param samples The input audio samples.
 * @returns True if valid, false otherwise.
 */
export function isValidHeartSound(samples: Float32Array): boolean {
  const rms = calculateRMS(samples);
  const peak = calculatePeakAmplitude(samples);
  const zcr = calculateZeroCrossingRate(samples);

  return rms > RMS_THRESHOLD && peak > PEAK_THRESHOLD && zcr < MAX_ZERO_CROSSING_RATE;
}

/**
 * Calculates a quality score (0-100) based on RMS amplitude and validation consistency.
 * @param rms The RMS value of the audio.
 * @param validCount Number of valid segments.
 * @param totalCount Total number of segments.
 * @returns A quality score between 0 and 100.
 */
export function calculateQualityScore(rms: number, validCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  const amplitudeScore = Math.min(100, (rms / QUALITY_RMS_CEILING) * 100);
  const consistencyScore = (validCount / totalCount) * 100;
  return (amplitudeScore * QUALITY_WEIGHTS.AMPLITUDE) + (consistencyScore * QUALITY_WEIGHTS.CONSISTENCY);
}

/**
 * Determines the quality level based on the quality score.
 * @param score The quality score (0-100).
 * @returns A string representing the quality level.
 */
export function getQualityLevel(score: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
  if (score >= QUALITY_THRESHOLDS.EXCELLENT) return 'Excellent';
  if (score >= QUALITY_THRESHOLDS.GOOD) return 'Good';
  if (score >= QUALITY_THRESHOLDS.FAIR) return 'Fair';
  return 'Poor';
}
