import React from 'react';
import { Activity } from 'lucide-react';

interface QualityMeterProps {
  score: number;
  level: string;
  isActive: boolean;
}

/**
 * Signal quality meter with red & yellowish-white styling.
 */
export const QualityMeter: React.FC<QualityMeterProps> = ({ score, level, isActive }) => {
  const getProgressColor = (sc: number) => {
    if (!isActive) return 'bg-stone-300 dark:bg-stone-700';
    if (sc >= 80) return 'bg-emerald-500';
    if (sc >= 50) return 'bg-amber-400';
    if (sc >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTextColor = (sc: number) => {
    if (!isActive) return 'text-stone-400 dark:text-stone-500';
    if (sc >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (sc >= 50) return 'text-amber-600 dark:text-amber-400';
    if (sc >= 25) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="flex items-center space-x-3">
      <div className={`p-2 rounded-xl flex-shrink-0 ${isActive ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-stone-100 dark:bg-red-950/40 text-stone-400'}`}>
        <Activity className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-amber-200/60">
            Acoustic Signal Quality
          </span>
          <span className={`text-xs font-bold ${getTextColor(score)}`}>
            {isActive ? `${level} (${Math.round(score)}%)` : 'Standby'}
          </span>
        </div>
        
        <div className="h-2 w-full bg-amber-100/70 dark:bg-stone-900 rounded-full overflow-hidden border border-amber-200/50 dark:border-red-950/60">
          <div 
            className={`h-full rounded-full transition-all duration-300 ease-out ${getProgressColor(score)}`}
            style={{ width: `${isActive ? Math.max(8, Math.min(100, score)) : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
};
