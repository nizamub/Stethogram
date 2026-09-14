import { describe, it, expect } from 'vitest';
import { parseClassificationResult } from './classifier';
import { HEART_CONDITIONS, CONDITION_COLORS } from '../../config/constants';

describe('classifier', () => {
  it('correctly parses argmax and maps to condition', () => {
    // Normal is index 0
    const probs = [0.85, 0.05, 0.04, 0.03, 0.03];
    const result = parseClassificationResult(probs, 42);

    expect(result.classIndex).toBe(0);
    expect(result.condition).toBe(HEART_CONDITIONS[0]);
    expect(result.color).toBe(CONDITION_COLORS[0]);
    expect(result.confidence).toBeCloseTo(0.85);
    expect(result.inferenceTimeMs).toBe(42);
  });

  it('handles other condition indices', () => {
    // Aortic Stenosis (AS) is index 1
    const probs = [0.1, 0.75, 0.05, 0.05, 0.05];
    const result = parseClassificationResult(probs, 55);

    expect(result.classIndex).toBe(1);
    expect(result.condition).toBe('Aortic Stenosis (AS)');
    expect(result.color).toBe(CONDITION_COLORS[1]);
  });
});
