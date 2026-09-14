import React from 'react';
import { Heart, Activity, Loader } from 'lucide-react';
import { ClassificationResult } from '@/domain/ml/classifier';

interface DiagnosisCardProps {
  result: ClassificationResult | null;
  isClassifying: boolean;
}

/**
 * Primary diagnosis card in red and warm yellowish-white theme.
 */
export const DiagnosisCard: React.FC<DiagnosisCardProps> = ({ result, isClassifying }) => {
  if (isClassifying && !result) {
    return (
      <div className="bg-white dark:bg-[#1E090D] rounded-2xl p-6 border border-amber-200/80 dark:border-red-950/70 shadow-sm flex flex-col items-center justify-center min-h-[220px]">
        <div className="relative mb-3">
          <div className="absolute inset-0 bg-red-500 rounded-full blur-xl opacity-30 animate-pulse" />
          <Loader className="w-10 h-10 text-red-600 dark:text-red-400 animate-spin relative" />
        </div>
        <p className="text-sm text-stone-600 dark:text-amber-100/70 font-semibold">Analyzing PCG Heart Sound...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-white dark:bg-[#1E090D] rounded-2xl p-6 border border-dashed border-amber-300 dark:border-red-950 flex flex-col items-center justify-center min-h-[220px] text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-amber-100/60 dark:bg-red-950/50 flex items-center justify-center mb-3">
          <Activity className="w-6 h-6 text-red-600/70 dark:text-red-400/80" />
        </div>
        <h3 className="text-sm font-bold text-stone-800 dark:text-amber-100">Ready for Cardiac Analysis</h3>
        <p className="text-xs text-stone-500 dark:text-amber-200/60 mt-1 max-w-[240px]">
          Tap <span className="font-semibold text-red-600 dark:text-red-400">Listen</span> or record chest audio to generate instant AI diagnosis.
        </p>
      </div>
    );
  }

  const colorCode = result.color || '#EF4444';

  return (
    <div className="bg-white dark:bg-[#1E090D] rounded-2xl p-5 sm:p-6 border border-amber-200/80 dark:border-red-950/70 shadow-sm flex flex-col justify-between relative overflow-hidden group min-h-[220px]">
      {/* Background radial glow */}
      <div 
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: colorCode }}
      />
      
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Heart className="w-4 h-4 text-red-600 dark:text-red-400 fill-current" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-amber-200/70">
              Primary Diagnostic Prediction
            </span>
          </div>
          {isClassifying && (
            <div className="flex items-center space-x-1 text-xs text-red-600 dark:text-red-400 font-medium">
              <Loader className="w-3 h-3 animate-spin" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: colorCode }}
          >
            {result.condition}
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-100 dark:bg-red-950/80 border border-amber-300/60 dark:border-red-900/60 text-xs font-bold text-stone-800 dark:text-amber-100">
              Confidence: {(result.confidence * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-stone-400 dark:text-amber-300/40">
              Inference: {result.inferenceTimeMs.toFixed(0)} ms
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-amber-100 dark:border-red-950/60 flex items-center justify-between text-xs text-stone-500 dark:text-amber-200/50">
        <span>CNN Spectrogram Classifier</span>
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Validated Signal</span>
      </div>
    </div>
  );
};
