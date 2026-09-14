import { createHannWindow, applyWindow } from './windowing';

/**
 * Computes the Short-Time Fourier Transform (STFT) of an audio signal.
 * Applies a Hann window to each frame and computes the magnitude spectrum.
 * @param audio The input audio samples.
 * @param frameLength The number of samples per frame.
 * @param frameStep The number of samples to advance between frames.
 * @returns A flat Float32Array of shape [nFrames, nBins] where nBins = frameLength / 2 + 1.
 */
export function computeSTFT(audio: Float32Array, frameLength: number, frameStep: number): Float32Array {
  const nFrames = Math.floor((audio.length - frameLength) / frameStep) + 1;
  const nBins = Math.floor(frameLength / 2) + 1;
  const result = new Float32Array(nFrames * nBins);
  const window = createHannWindow(frameLength);

  for (let i = 0; i < nFrames; i++) {
    const start = i * frameStep;
    const frame = audio.slice(start, start + frameLength);
    const windowedFrame = applyWindow(frame, window);

    // Compute DFT for this frame (magnitude only)
    for (let k = 0; k < nBins; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < frameLength; n++) {
        const angle = (2 * Math.PI * k * n) / frameLength;
        re += windowedFrame[n] * Math.cos(angle);
        im -= windowedFrame[n] * Math.sin(angle);
      }
      const magnitude = Math.sqrt(re * re + im * im);
      result[i * nBins + k] = magnitude;
    }
  }

  return result;
}
