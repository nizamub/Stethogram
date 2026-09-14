import React from 'react';
import { Mic, RefreshCw } from 'lucide-react';

interface DeviceSelectorProps {
  devices: Array<{ deviceId: string; label: string }>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRequestPermission?: () => void;
}

/**
 * Dropdown for selecting audio input device in red & warm ivory theme.
 */
export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedId,
  onSelect,
  onRequestPermission
}) => {
  const displayDevices = devices.length > 0 ? devices : [
    { deviceId: '', label: 'Default Microphone' }
  ];

  return (
    <div className="bg-white dark:bg-[#1E090D] border border-amber-200/80 dark:border-red-950/70 rounded-2xl p-2.5 sm:p-3 flex items-center space-x-3 shadow-sm transition-colors">
      <div className="p-2 bg-amber-100 dark:bg-red-950/80 rounded-xl text-red-700 dark:text-red-300 flex-shrink-0">
        <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <div className="flex-1 relative min-w-0">
        <select
          value={selectedId || ''}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full appearance-none bg-transparent text-xs sm:text-sm font-semibold text-stone-900 dark:text-amber-50 focus:outline-none focus:ring-0 cursor-pointer pr-7 truncate"
        >
          {displayDevices.map((device, index) => (
            <option key={device.deviceId || `device-${index}`} value={device.deviceId} className="dark:bg-[#1A0A0C] text-stone-900 dark:text-amber-100">
              {device.label || `Microphone ${index + 1}`}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-amber-700 dark:text-amber-400">
          <svg className="h-3.5 w-3.5 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      {onRequestPermission && (
        <button
          type="button"
          onClick={onRequestPermission}
          title="Refresh / Detect Microphones"
          className="px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:text-amber-200 bg-amber-100/70 dark:bg-red-950/80 hover:bg-amber-200/70 dark:hover:bg-red-900/60 rounded-xl transition-colors flex items-center space-x-1 flex-shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Detect</span>
        </button>
      )}
    </div>
  );
};
