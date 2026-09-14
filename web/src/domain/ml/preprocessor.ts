import { computeSTFT } from '../dsp/stft';
import { N_BINS, FRAME_LENGTH, FRAME_STEP } from '../../config/constants';

/**
 * Preprocesses audio data for machine learning inference.
 * Zero-pads or truncates the signal, computes its STFT, and formats
 * into a flat [N_FRAMES * N_BINS] matrix with bin padding to match CNN tensor [1, 999, 65, 1].
 * @param audioData The input audio samples.
 * @param inputSamples The required number of input samples (40000).
 * @param frameLength The STFT frame length (80).
 * @param frameStep The STFT frame step (40).
 * @param targetBins Target frequency bins for CNN input (65).
 * @returns A flat Float32Array of length nFrames * targetBins.
 */
export function preprocessAudio(
  audioData: Float32Array,
  inputSamples: number,
  frameLength: number = FRAME_LENGTH,
  frameStep: number = FRAME_STEP,
  targetBins: number = N_BINS
): Float32Array {
  let processedAudio = audioData;
  if (audioData.length >= inputSamples) {
    // Take first inputSamples samples
    processedAudio = audioData.slice(0, inputSamples);
  } else {
    // Zero-pad at the beginning (matching Android lines 443-446)
    processedAudio = new Float32Array(inputSamples);
    const offset = inputSamples - audioData.length;
    processedAudio.set(audioData, offset);
  }

  // Raw STFT produces nFrames x rawBins where rawBins = frameLength / 2 + 1 (41)
  const rawSpectrogram = computeSTFT(processedAudio, frameLength, frameStep);
  const nFrames = Math.floor((inputSamples - frameLength) / frameStep) + 1;
  const rawBins = Math.floor(frameLength / 2) + 1; // 41 bins

  // Pad to targetBins (65) to match the CNN input tensor shape [1, 999, 65, 1]
  const paddedSpectrogram = new Float32Array(nFrames * targetBins);

  for (let i = 0; i < nFrames; i++) {
    for (let j = 0; j < Math.min(rawBins, targetBins); j++) {
      paddedSpectrogram[i * targetBins + j] = rawSpectrogram[i * rawBins + j];
    }
  }

  return paddedSpectrogram;
}
