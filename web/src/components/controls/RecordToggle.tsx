import React from 'react';
import { Mic, Square, Circle } from 'lucide-react';

interface RecordToggleProps {
  isRecording: boolean;
  duration: number;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Large tactile mobile card for lossless WAV recording.
 */
export const RecordToggle: React.FC<RecordToggleProps> = ({ isRecording, duration, onToggle, disabled }) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      type="button"
      className={`
        btn-tactile relative w-full overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-300
        border flex items-center justify-between group
        ${disabled ? 'opacity-50 cursor-not-allowed border-amber-200 dark:border-red-950 bg-amber-50/50 dark:bg-[#1A0A0C]/50' : 
          isRecording 
            ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-950/30 shadow-[0_0_25px_-5px_rgba(245,158,11,0.3)]' 
            : 'border-amber-200/80 dark:border-red-950/70 bg-white dark:bg-[#1E090D] hover:border-amber-400 dark:hover:border-amber-700 shadow-sm'
        }
      `}
    >
      {/* Background glow when recording */}
      {isRecording && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 via-red-500/10 to-transparent animate-pulse pointer-events-none" />
      )}

      <div className="relative flex items-center space-x-3.5">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
          ${isRecording ? 'bg-amber-500 text-white shadow-md shadow-amber-500/40' : 'bg-amber-100 dark:bg-red-950/80 text-amber-800 dark:text-amber-300'}
        `}>
          <Mic className="w-6 h-6" />
        </div>
        
        <div className="text-left">
          <h2 className="text-base font-bold text-stone-900 dark:text-amber-50 tracking-tight">Record</h2>
          <div className="flex items-center space-x-1.5 mt-0.5">
            {isRecording ? (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs text-amber-700 dark:text-amber-300 font-mono font-bold">
                  {formatTime(duration)} (Saving WAV)
                </span>
              </>
            ) : (
              <span className="text-xs text-stone-500 dark:text-amber-200/60 font-medium">Capture & Export</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Action icon */}
      <div className={`
        w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0
        ${isRecording ? 'bg-red-500/20 text-red-600 dark:text-red-400' : 'bg-amber-100/70 dark:bg-red-950/60 text-amber-800 dark:text-amber-400'}
      `}>
        {isRecording ? (
          <Square className="w-4 h-4 fill-current" />
        ) : (
          <Circle className="w-4 h-4 fill-current" />
        )}
      </div>
    </button>
  );
};
