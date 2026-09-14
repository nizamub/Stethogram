// ─── Audio Capture ──────────────────────────────────────────────────────────

/** Target sample rate for heart sound analysis (matches Android app) */
export const TARGET_SAMPLE_RATE = 16_000;

/** AudioWorklet buffer size in samples at target rate (~128ms chunks) */
export const WORKLET_BUFFER_SIZE = 2048;

// ─── Heart Sound Validation Thresholds ──────────────────────────────────────

/** Minimum RMS amplitude for a valid heart sound signal (Float32 scale: 500/32768) */
export const RMS_THRESHOLD = 0.006;

/** Minimum peak amplitude for a valid heart sound signal (Float32 scale: 1000/32768) */
export const PEAK_THRESHOLD = 0.012;

/** Maximum zero-crossing rate (heart sounds are low frequency → low ZCR) */
export const MAX_ZERO_CROSSING_RATE = 0.35;

// ─── STFT Parameters (must match model training exactly) ────────────────────

/** Number of samples per STFT frame */
export const FRAME_LENGTH = 80;

/** Hop size between frames */
export const FRAME_STEP = 40;

/** Number of time frames in the spectrogram: floor((INPUT_SAMPLES - FRAME_LENGTH) / FRAME_STEP) + 1 */
export const N_FRAMES = 999;

/** Number of frequency bins: FRAME_LENGTH / 2 + 1 */
export const N_BINS = 65;

// ─── ML Model ───────────────────────────────────────────────────────────────

/** Total input samples for one classification window (2.5 sec at 16kHz) */
export const INPUT_SAMPLES = 40_000;

/** Path to the TFLite model file (served from public/) */
export const MODEL_PATH = '/models/ASL_TFLite.tflite';

/** Number of classification output classes */
export const NUM_CLASSES = 5;

/** Heart condition labels (order must match model training) */
export const HEART_CONDITIONS = [
  'Normal',
  'Aortic Stenosis (AS)',
  'Mitral Regurgitation (MR)',
  'Mitral Stenosis (MS)',
  'Mitral Valve Prolapse (MVP)',
] as const;

/** Short labels for compact display */
export const HEART_CONDITIONS_SHORT = [
  'Normal',
  'Aortic S.',
  'Mitral R.',
  'Mitral S.',
  'MVP',
] as const;

/** CSS color for each condition (index-matched to HEART_CONDITIONS) */
export const CONDITION_COLORS = [
  '#4CAF50', // Normal — Green
  '#F44336', // AS — Red
  '#FFEB3B', // MR — Yellow
  '#9C27B0', // MS — Magenta/Purple
  '#00BCD4', // MVP — Cyan
] as const;

/** Tailwind text color class for each condition */
export const CONDITION_TEXT_CLASSES = [
  'text-heart-normal',
  'text-heart-as',
  'text-heart-mr',
  'text-heart-ms',
  'text-heart-mvp',
] as const;

// ─── Audio Quality ──────────────────────────────────────────────────────────

/** Quality score thresholds */
export const QUALITY_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
} as const;

/** Quality score weights */
export const QUALITY_WEIGHTS = {
  AMPLITUDE: 0.7,
  CONSISTENCY: 0.3,
} as const;

/** RMS normalization ceiling for quality scoring (Float32 scale: 2000/32768 ~ 0.06) */
export const QUALITY_RMS_CEILING = 0.050;

// ─── Visualization ──────────────────────────────────────────────────────────

/** Waveform canvas refresh rate in milliseconds */
export const WAVEFORM_REFRESH_MS = 16; // ~60fps

/** Number of samples visible in the waveform display */
export const WAVEFORM_DISPLAY_SAMPLES = 1024;

/** Spectrogram canvas height in frequency bins */
export const SPECTROGRAM_HEIGHT = 128;

/** Spectrogram rolling history length in columns */
export const SPECTROGRAM_HISTORY = 200;
