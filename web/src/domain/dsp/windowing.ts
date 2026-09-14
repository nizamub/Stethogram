/**
 * Generates a Hann window of the given length.
 * Formula: w[n] = 0.5 * (1 - cos(2π * n / (N-1)))
 * @param length The length of the window to generate.
 * @returns A Float32Array containing the Hann window.
 */
export function createHannWindow(length: number): Float32Array {
  const window = new Float32Array(length);
  for (let n = 0; n < length; n++) {
    window[n] = 0.5 * (1 - Math.cos((2 * Math.PI * n) / (length - 1)));
  }
  return window;
}

/**
 * Applies a window to a set of audio samples by performing element-wise multiplication.
 * @param samples The input audio samples.
 * @param window The window function values. Must be the same length as samples.
 * @returns A new Float32Array containing the windowed samples.
 */
export function applyWindow(samples: Float32Array, window: Float32Array): Float32Array {
  if (samples.length !== window.length) {
    throw new Error('Samples and window must have the same length');
  }
  const result = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    result[i] = samples[i] * window[i];
  }
  return result;
}
