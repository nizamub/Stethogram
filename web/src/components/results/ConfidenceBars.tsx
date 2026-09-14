import React from 'react';
import { CONDITION_COLORS, HEART_CONDITIONS_SHORT } from '@/config/constants';

interface ConfidenceBarsProps {
  probabilities: number[] | null;
}

/**
 * 5-condition probability breakdown with red and warm yellowish-white theme.
 */
export const ConfidenceBars: React.FC<ConfidenceBarsProps> = ({ probabilities }) => {
  const displayProbs = probabilities || Array(HEART_CONDITIONS_SHORT.length).fill(0);

  return (
    <div className="space-y-3.5">
      {HEART_CONDITIONS_SHORT.map((shortName: string, idx: number) => {
        const prob = displayProbs[idx] || 0;
        const percent = Math.round(prob * 100);
        const color = CONDITION_COLORS[idx] || '#EF4444';
        
        return (
          <div key={shortName} className="flex items-center space-x-3 text-xs sm:text-sm">
            <div className="w-20 sm:w-24 flex-shrink-0">
              <span className="font-bold text-stone-800 dark:text-amber-100 truncate block">
                {shortName}
              </span>
            </div>
            
            <div className="flex-1 h-3 bg-amber-100/60 dark:bg-stone-900 rounded-full overflow-hidden border border-amber-200/50 dark:border-red-950/60 relative">
              <div 
                className="h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ 
                  width: `${Math.max(2, percent)}%`,
                  backgroundColor: color
                }}
              />
            </div>
            
            <div className="w-10 flex-shrink-0 text-right">
              <span className="font-mono font-bold text-stone-700 dark:text-amber-200">
                {percent}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
