import React, { useRef, useEffect } from 'react';

interface WaveformCanvasProps {
  data: Float32Array | null;
  isActive: boolean;
}

/**
 * High-performance 60 FPS oscilloscope with medical visual gain and red/gold theme.
 */
export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({ data, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      // Draw subtle medical grid lines
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.08)';
      ctx.lineWidth = 1;
      const step = 20;
      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw baseline center line (warm gold/amber)
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.strokeStyle = isActive ? 'rgba(245, 158, 11, 0.4)' : 'rgba(150, 150, 150, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (isActive && data && data.length > 0) {
        // Visual amplification factor for phonocardiogram (PCG) acoustic signals
        const visualGain = 5.0;
        const sliceWidth = width / data.length;

        // Draw gradient area underneath waveform
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.3)');
        gradient.addColorStop(0.5, 'rgba(254, 240, 138, 0.15)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');

        ctx.beginPath();
        ctx.moveTo(0, height / 2);

        for (let i = 0; i < data.length; i++) {
          const sample = data[i] * visualGain;
          const clamped = Math.max(-1, Math.min(1, sample));
          const y = (clamped * (height / 2.2)) + (height / 2);
          const x = i * sliceWidth;
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height / 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw main ECG-style stroke line
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
          const sample = data[i] * visualGain;
          const clamped = Math.max(-1, Math.min(1, sample));
          const y = (clamped * (height / 2.2)) + (height / 2);
          const x = i * sliceWidth;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = '#EF4444'; // Radiant Crimson
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
        ctx.shadowBlur = 6;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [data, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-[150px] block rounded-xl"
      style={{ width: '100%', height: '150px' }}
    />
  );
};
