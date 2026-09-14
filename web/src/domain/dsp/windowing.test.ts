import { describe, it, expect } from 'vitest';
import { createHannWindow, applyWindow } from './windowing';

describe('windowing', () => {
  it('creates a Hann window of specified length', () => {
    const len = 80;
    const window = createHannWindow(len);
    expect(window.length).toBe(len);
    // Endpoints should be 0 or near 0
    expect(window[0]).toBeCloseTo(0, 4);
    expect(window[len - 1]).toBeCloseTo(0, 4);
    // Peak near center should be 1
    const center = Math.floor(len / 2);
    expect(window[center]).toBeGreaterThan(0.95);
  });

  it('applies window element-wise', () => {
    const samples = new Float32Array([1, 2, 3, 4]);
    const window = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const result = applyWindow(samples, window);
    expect(result[0]).toBeCloseTo(0.5);
    expect(result[1]).toBeCloseTo(1.0);
    expect(result[2]).toBeCloseTo(1.5);
    expect(result[3]).toBeCloseTo(2.0);
  });
});
