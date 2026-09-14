import React from 'react';
import { Activity, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface StatusBarProps {
  modelState: string;
  backendName: string;
}

/**
 * Bottom status bar in red & warm ivory theme.
 */
export const StatusBar: React.FC<StatusBarProps> = ({ modelState, backendName }) => {
  const renderStateIcon = () => {
    switch (modelState) {
      case 'ready':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default:
        return <Loader className="w-3.5 h-3.5 text-red-500 animate-spin" />;
    }
  };

  const getStateText = () => {
    switch (modelState) {
      case 'ready': return 'AI Engine: Active';
      case 'downloading': return 'AI Engine: Downloading...';
      case 'loading': return 'AI Engine: Loading...';
      case 'warming-up': return 'AI Engine: Warming up...';
      case 'error': return 'AI Engine: Notice / Standby';
      default: return 'AI Engine: Initializing';
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 h-9 bg-[#FFFDF5]/95 dark:bg-[#140507]/95 backdrop-blur-md border-t border-amber-200/60 dark:border-red-950/80 z-40 transition-colors">
      <div className="max-w-xl mx-auto px-4 h-full flex items-center justify-between text-[11px] font-semibold text-stone-600 dark:text-amber-200/70">
        <div className="flex items-center space-x-1.5">
          {renderStateIcon()}
          <span>{getStateText()}</span>
        </div>
        
        <div className="flex items-center space-x-1.5 bg-amber-100/70 dark:bg-red-950/60 px-2.5 py-0.5 rounded-full text-stone-700 dark:text-amber-100">
          <Activity className="w-3 h-3 text-red-600 dark:text-red-400" />
          <span>Runtime: {backendName || 'wasm'}</span>
        </div>
      </div>
    </footer>
  );
};
