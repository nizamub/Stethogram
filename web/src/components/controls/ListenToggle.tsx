import React from 'react';
import { Headphones, Radio } from 'lucide-react';

interface ListenToggleProps {
  isListening: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Large tactile mobile card for toggling heart auscultation.
 */
export const ListenToggle: React.FC<ListenToggleProps> = ({ isListening, onToggle, disabled }) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      type="button"
      className={`
        btn-tactile relative w-full overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-300
        border flex items-center justify-between group
        ${disabled ? 'opacity-50 cursor-not-allowed border-amber-200 dark:border-red-950 bg-amber-50/50 dark:bg-[#1A0A0C]/50' : 
          isListening 
            ? 'border-red-500 bg-red-600/10 dark:bg-red-900/30 shadow-[0_0_25px_-5px_rgba(239,68,68,0.3)]' 
            : 'border-amber-200/80 dark:border-red-950/70 bg-white dark:bg-[#1E090D] hover:border-red-400 dark:hover:border-red-800 shadow-sm'
        }
      `}
    >
      {/* Background radial glow when active */}
      {isListening && (
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/15 via-amber-500/10 to-transparent animate-pulse pointer-events-none" />
      )}

      <div className="relative flex items-center space-x-3.5">
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
          ${isListening ? 'bg-red-600 text-white shadow-md shadow-red-600/40' : 'bg-amber-100 dark:bg-red-950/80 text-red-700 dark:text-red-300'}
        `}>
          <Headphones className="w-6 h-6" />
        </div>
        
        <div className="text-left">
          <h2 className="text-base font-bold text-stone-900 dark:text-amber-50 tracking-tight">Listen</h2>
          <div className="flex items-center space-x-1.5 mt-0.5">
            {isListening ? (
              <>
                <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className="text-xs text-red-600 dark:text-red-400 font-semibold">Active Auscultation</span>
              </>
            ) : (
              <span className="text-xs text-stone-500 dark:text-amber-200/60 font-medium">Tap to start listening</span>
            )}
          </div>
        </div>
      </div>
      
      {/* Visual pill toggle */}
      <div className={`
        w-12 h-6 rounded-full p-0.5 transition-colors relative flex-shrink-0
        ${isListening ? 'bg-red-600' : 'bg-stone-200 dark:bg-red-950'}
      `}>
        <div className={`
          w-5 h-5 rounded-full bg-white dark:bg-amber-50 shadow-sm transition-transform duration-300
          ${isListening ? 'translate-x-6' : 'translate-x-0'}
        `} />
      </div>
    </button>
  );
};
