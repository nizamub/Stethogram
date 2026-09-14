import React, { useEffect, useState } from 'react';
import { Header } from '../layout/Header';
import { StatusBar } from '../layout/StatusBar';
import { LoadingScreen } from './LoadingScreen';
import { ListenToggle } from '../controls/ListenToggle';
import { RecordToggle } from '../controls/RecordToggle';
import { DeviceSelector } from '../controls/DeviceSelector';
import { WaveformCanvas } from '../visualization/WaveformCanvas';
import { QualityMeter } from '../visualization/QualityMeter';
import { DiagnosisCard } from '../results/DiagnosisCard';
import { ConfidenceBars } from '../results/ConfidenceBars';

import { useAudioEngine } from '@/hooks/useAudioEngine';
import { useClassifier } from '@/hooks/useClassifier';
import { useRecorder } from '@/hooks/useRecorder';
import { useVisualization } from '@/hooks/useVisualization';
import * as tf from '@tensorflow/tfjs';
import { Heart, Waves } from 'lucide-react';

/**
 * Main mobile-first cardiac dashboard in Red & Warm Ivory theme.
 */
export const Dashboard: React.FC = () => {
  const classifier = useClassifier();
  const visualization = useVisualization();

  // On recording completion, automatically classify the recorded chest sound
  const recorder = useRecorder((buffer) => {
    classifier.classifyBuffer(buffer);
  });
  
  const audioEngine = useAudioEngine(
    // Triggered every 2.5s (40,000 samples) for live ML classification
    (buffer) => {
      classifier.classifyBuffer(buffer);
    },
    // Triggered continuously for real-time 60fps waveform oscilloscope and recorder
    (chunk) => {
      visualization.pushSamples(chunk);
      recorder.addChunk(chunk);
    }
  );

  const [backendName, setBackendName] = useState<string>('initializing...');

  useEffect(() => {
    tf.ready().then(() => {
      setBackendName(tf.getBackend() || 'wasm');
    }).catch(() => {
      setBackendName('wasm');
    });
  }, []);

  const showLoading = classifier.modelState !== 'ready' && classifier.modelState !== 'error';

  return (
    <div className="min-h-screen bg-[#FFFDF5] dark:bg-[#140507] text-stone-900 dark:text-amber-50 transition-colors pt-18 pb-14 font-sans">
      {showLoading && (
        <LoadingScreen 
          progress={classifier.modelLoadPercent} 
          state={
            classifier.modelState === 'downloading' ? 'Downloading Cardiac Model...' : 
            classifier.modelState === 'warming-up' ? 'Initializing Neural Engine...' : 'Warming up...'
          } 
        />
      )}

      <Header />
      
      <main className="max-w-xl mx-auto px-3 sm:px-4 py-3 space-y-3.5">
        
        {/* Device Selection & Microphone Picker */}
        <section>
          <DeviceSelector 
            devices={audioEngine.inputDevices} 
            selectedId={audioEngine.selectedDeviceId} 
            onSelect={audioEngine.selectDevice} 
            onRequestPermission={audioEngine.requestPermission}
          />
        </section>

        {/* Audio / Hardware Error Banner */}
        {audioEngine.error && (
          <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-900/80 rounded-2xl p-3 text-xs text-red-800 dark:text-red-200 flex items-start space-x-2.5 shadow-sm">
            <span className="text-base leading-none">⚠️</span>
            <div className="flex-1">
              <p className="font-bold">Microphone Notice</p>
              <p className="mt-0.5">{audioEngine.error}</p>
            </div>
          </div>
        )}

        {/* Model Notice Banner */}
        {classifier.error && (
          <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-900/80 rounded-2xl p-3 text-xs text-amber-800 dark:text-amber-200 flex items-start space-x-2.5 shadow-sm">
            <span className="text-base leading-none">ℹ️</span>
            <div className="flex-1">
              <p className="font-bold">AI Diagnostic Engine</p>
              <p className="mt-0.5">{classifier.error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-1.5 px-2.5 py-0.5 bg-amber-200/80 dark:bg-amber-900/80 rounded-lg text-stone-900 dark:text-amber-100 font-bold"
              >
                Reload
              </button>
            </div>
          </div>
        )}

        {/* Controls: Listen & Record */}
        <section className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <ListenToggle 
            isListening={audioEngine.isListening}
            onToggle={audioEngine.isListening ? audioEngine.stopListening : audioEngine.startListening}
            disabled={classifier.modelState !== 'ready' && classifier.modelState !== 'error'}
          />
          
          <RecordToggle 
            isRecording={recorder.isRecording}
            duration={recorder.duration}
            onToggle={recorder.isRecording ? recorder.stopRecording : recorder.startRecording}
            disabled={!audioEngine.isListening}
          />
        </section>

        {/* Real-time Oscilloscope & Quality Meter */}
        <section className="bg-white dark:bg-[#1E090D] rounded-2xl shadow-sm border border-amber-200/80 dark:border-red-950/70 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-stone-700 dark:text-amber-100">
              <Waves className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span>Phonocardiogram (PCG)</span>
            </div>
            
            {audioEngine.isListening && (
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-[10px] font-bold text-red-700 dark:text-red-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>LIVE 16 kHz</span>
              </div>
            )}
          </div>

          <div className="rounded-xl overflow-hidden bg-[#120406] border border-amber-200/30 dark:border-red-950/80 relative">
            <WaveformCanvas 
              data={visualization.waveformData} 
              isActive={audioEngine.isListening} 
            />
            {!audioEngine.isListening && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#120406]/70 backdrop-blur-[2px]">
                <span className="text-xs font-semibold text-amber-200/50">Tap Listen to stream heart sound</span>
              </div>
            )}
          </div>

          <QualityMeter 
            score={classifier.qualityMetrics?.score || 0}
            level={classifier.qualityMetrics?.level || 'Standby'}
            isActive={audioEngine.isListening}
          />
        </section>

        {/* Primary Diagnosis & Confidence Breakdown */}
        <section className="space-y-3">
          <DiagnosisCard 
            result={classifier.result} 
            isClassifying={classifier.isClassifying} 
          />

          <div className="bg-white dark:bg-[#1E090D] rounded-2xl shadow-sm border border-amber-200/80 dark:border-red-950/70 p-4">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-amber-200/70 flex items-center space-x-1.5">
                <Heart className="w-3.5 h-3.5 text-red-500" />
                <span>Diagnostic Probability Breakdown</span>
              </h3>
              <span className="text-[11px] text-amber-700 dark:text-amber-300/60 font-semibold">5 Classes</span>
            </div>
            <ConfidenceBars probabilities={classifier.result?.probabilities || null} />
          </div>
        </section>

      </main>

      <StatusBar 
        modelState={classifier.modelState} 
        backendName={backendName} 
      />
    </div>
  );
};
