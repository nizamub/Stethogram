import React, { useEffect, useState } from 'react';
import { Heart, Sun, Moon } from 'lucide-react';

/**
 * Main application header styled in Red & Warm Ivory.
 */
export const Header: React.FC = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-[#FFFDF5]/90 dark:bg-[#140507]/90 backdrop-blur-md border-b border-amber-200/60 dark:border-red-950/80 transition-colors">
      <div className="max-w-xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-md shadow-red-500/20 text-white">
            <Heart className="w-5 h-5 fill-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-red-900 dark:text-red-100 tracking-tight leading-none">
              Stethogram
            </h1>
            <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-200/70 tracking-wide">
              AI Cardiac Auscultation
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsDark(!isDark)}
          className="w-9 h-9 rounded-full bg-amber-100 dark:bg-red-950/60 hover:bg-amber-200 dark:hover:bg-red-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-center transition-colors shadow-sm"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-amber-700" />}
        </button>
      </div>
    </header>
  );
};
