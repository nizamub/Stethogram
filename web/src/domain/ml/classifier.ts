import { HEART_CONDITIONS, CONDITION_COLORS } from '../../config/constants';

export interface ClassificationResult {
  condition: string;
  classIndex: number;
  confidence: number;
  probabilities: number[];
  color: string;
  timestamp: number;
  inferenceTimeMs: number;
}

/**
 * Parses raw classification probabilities into a structured ClassificationResult.
 * @param probabilities Array of probabilities output by the model.
 * @param inferenceTimeMs Time taken for inference in milliseconds.
 * @returns A ClassificationResult object containing the prediction details.
 */
export function parseClassificationResult(
  probabilities: Float32Array | number[],
  inferenceTimeMs: number
): ClassificationResult {
  const probsArray = Array.from(probabilities);
  let maxIndex = 0;
  let maxProb = -1;

  for (let i = 0; i < probsArray.length; i++) {
    if (probsArray[i] > maxProb) {
      maxProb = probsArray[i];
      maxIndex = i;
    }
  }

  const condition = HEART_CONDITIONS[maxIndex] || 'Unknown';
  const color = CONDITION_COLORS[maxIndex] || '#808080';

  return {
    condition,
    classIndex: maxIndex,
    confidence: maxProb,
    probabilities: probsArray,
    color,
    timestamp: Date.now(),
    inferenceTimeMs
  };
}
