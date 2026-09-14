import type { HEART_CONDITIONS } from '@/config/constants';

// ─── Heart Condition Types ──────────────────────────────────────────────────

/** Union type of all heart condition labels */
export type HeartCondition = (typeof HEART_CONDITIONS)[number];

/** Result of a single classification inference */
export interface ClassificationResult {
  /** Predicted condition label */
  condition: HeartCondition;
  /** Index of the predicted class (0-4) */
  classIndex: number;
  /** Confidence of the top prediction (0.0 - 1.0) */
  confidence: number;
  /** All class probabilities (length = NUM_CLASSES) */
  probabilities: number[];
  /** CSS color for the predicted condition */
  color: string;
  /** Timestamp when the classification was made */
  timestamp: number;
  /** Time taken for inference in milliseconds */
  inferenceTimeMs: number;
}

// ─── Audio Quality Types ────────────────────────────────────────────────────

/** Quality level label */
export type QualityLevel = 'Excellent' | 'Good' | 'Fair' | 'Poor';

/** Audio quality metrics for a single analysis window */
export interface AudioQualityMetrics {
  /** Root mean square amplitude */
  rms: number;
  /** Peak absolute amplitude */
  peak: number;
  /** Zero-crossing rate (0.0 - 1.0) */
  zeroCrossingRate: number;
  /** Whether this window passes heart sound validation */
  isValid: boolean;
  /** Overall quality score (0 - 100) */
  score: number;
  /** Human-readable quality label */
  level: QualityLevel;
}

// ─── Audio Engine Types ─────────────────────────────────────────────────────

/** State of the audio engine */
export type AudioEngineState = 'idle' | 'starting' | 'listening' | 'error';

/** Information about an audio input device */
export interface AudioInputDevice {
  deviceId: string;
  label: string;
  isDefault: boolean;
}

/** Callback when a PCM audio chunk is received from the AudioWorklet */
export type PCMChunkCallback = (pcmData: Float32Array) => void;

/** Callback for real-time amplitude updates */
export type AmplitudeCallback = (amplitude: number) => void;

// ─── Model Manager Types ────────────────────────────────────────────────────

/** State of the ML model lifecycle */
export type ModelState = 'unloaded' | 'downloading' | 'loading' | 'warming-up' | 'ready' | 'error';

/** Progress event during model download */
export interface ModelLoadProgress {
  state: ModelState;
  /** Download progress percentage (0 - 100) */
  percent: number;
  /** Error message if state is 'error' */
  error?: string;
}

// ─── Recorder Types ─────────────────────────────────────────────────────────

/** State of the audio recorder */
export type RecorderState = 'idle' | 'recording' | 'processing';

// ─── Visualization Types ────────────────────────────────────────────────────

/** Waveform data for Canvas rendering */
export interface WaveformData {
  /** Time-domain samples for display */
  samples: Float32Array;
  /** Current amplitude level (0.0 - 1.0) */
  amplitude: number;
}

/** Spectrogram column data */
export interface SpectrogramColumn {
  /** Magnitude values for each frequency bin */
  magnitudes: Float32Array;
}

// ─── App State ──────────────────────────────────────────────────────────────

/** Top-level application state */
export interface AppState {
  audioEngine: AudioEngineState;
  isPlaybackEnabled: boolean;
  isRecording: boolean;
  modelState: ModelState;
  modelLoadPercent: number;
  currentResult: ClassificationResult | null;
  qualityMetrics: AudioQualityMetrics | null;
  amplitude: number;
  selectedDeviceId: string | null;
  availableDevices: AudioInputDevice[];
  recordingDuration: number;
  isDarkMode: boolean;
}
