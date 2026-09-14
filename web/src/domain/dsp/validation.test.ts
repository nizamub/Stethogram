import { describe, it, expect } from 'vitest';
import {
  calculateRMS,
  calculatePeakAmplitude,
  calculateZeroCrossings,
  calculateZeroCrossingRate,
  isValidHeartSound,
  calculateQualityScore,
  getQualityLevel,
} from './validation';

describe('validation', () => {
  it('calculates RMS correctly', () => {
    const signal = new Float32Array([3, -4, 0, 0]);
    // sum of squares = 9 + 16 = 25, mean = 25/4 = 6.25, sqrt = 2.5
    expect(calculateRMS(signal)).toBeCloseTo(2.5);
  });

  it('calculates peak amplitude correctly', () => {
    const signal = new Float32Array([10, -500, 200, -1200, 40]);
    expect(calculatePeakAmplitude(signal)).toBe(1200);
  });

  it('calculates zero crossings and rate', () => {
    const alternating = new Float32Array([1, -1, 1, -1, 1]);
    expect(calculateZeroCrossings(alternating)).toBe(4);
    expect(calculateZeroCrossingRate(alternating)).toBeCloseTo(4 / 5);
  });

  it('validates heart sound criteria', () => {
    // Silent signal
    const silent = new Float32Array(1000).fill(0);
    expect(isValidHeartSound(silent)).toBe(false);

    // High amplitude, low frequency signal
    const validSignal = new Float32Array(1000);
    for (let i = 0; i < validSignal.length; i++) {
      validSignal[i] = 2500 * Math.sin((2 * Math.PI * 50 * i) / 16000);
    }
    expect(isValidHeartSound(validSignal)).toBe(true);
  });

  it('determines quality score and level', () => {
    const score = calculateQualityScore(1500, 10, 10);
    expect(score).toBeGreaterThan(70);
    expect(getQualityLevel(90)).toBe('Excellent');
    expect(getQualityLevel(70)).toBe('Good');
    expect(getQualityLevel(50)).toBe('Fair');
    expect(getQualityLevel(20)).toBe('Poor');
  });
});
