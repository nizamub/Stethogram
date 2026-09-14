import React from 'react';
import { Heart } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
  state: string;
}

/**
 * Full-screen loading overlay.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, state }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center transition-colors">
      <div className="relative mb-8">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 rounded-full animate-pulse" />
        
        <div className="relative bg-white dark:bg-slate-900 p-6 rounded-full shadow-2xl border border-slate-200 dark:border-slate-800">
          <Heart className="w-16 h-16 text-blue-500 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
          <Heart className="w-16 h-16 text-blue-600 absolute top-6 left-6" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">
        Stethogram
      </h1>
      <p className="text-slate-500 dark:text-slate-400 mb-12 font-medium">
        Digital Stethoscope AI
      </p>

      <div className="w-64 max-w-[80vw]">
        <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
          <span>{state}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        
        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute top-0 right-0 bottom-0 left-0 bg-white/20 animate-[pulse_1s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
};
