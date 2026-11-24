import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getGlyphs, I18N, Lang } from '../game/i18n';
import { ControllerType, GraphicsQuality, TargetFpsOption } from '../game/types';

export const BENCH_FPS_TARGETS: TargetFpsOption[] = [30, 60, 120, 144, 244];

interface BenchmarkModalProps {
  lang: Lang;
  controllerType: ControllerType;
  targetFps: TargetFpsOption;
  focusRow: number; // 0: Target FPS, 1: Run Bench, 2: Apply Preset, 3: Back
  confirmSignal: number;
  onFocusRow: (row: number) => void;
  onHasResultChange: (hasResult: boolean) => void;
  onChangeTargetFps: (fps: TargetFpsOption) => void;
  onApplyPreset: (quality: GraphicsQuality, fpsLimit: TargetFpsOption) => void;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({
  lang,
  controllerType,
  targetFps,
  focusRow,
  confirmSignal,
  onFocusRow,
  onHasResultChange,
  onChangeTargetFps,
  onApplyPreset,
  onClose,
}) => {
  const t = I18N[lang];
  const glyphs = getGlyphs(controllerType);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [avgFps, setAvgFps] = useState<number | null>(null);
  const [recommendedQ, setRecommendedQ] = useState<GraphicsQuality | null>(null);
  const [applied, setApplied] = useState(false);
  const stressCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastSignalRef = useRef(confirmSignal);

  const pickRecommendedQuality = useCallback((measuredFps: number, target: TargetFpsOption): GraphicsQuality => {
    const goal = target === 0 ? 60 : target;
    if (measuredFps >= goal * 0.94) return 'high';
    if (measuredFps >= goal * 0.65) return 'medium';
    return 'low';
  }, []);

  const startBenchmark = useCallback(() => {
    if (running) return;
    setAvgFps(null);
    setRecommendedQ(null);
    onHasResultChange(false);
    setApplied(false);
    setProgress(0);
    setRunning(true);
  }, [running, onHasResultChange]);

  // Handle gamepad Confirm button trigger from App.tsx
  useEffect(() => {
    if (confirmSignal === lastSignalRef.current) return;
    lastSignalRef.current = confirmSignal;
    if (running) return;

    if (focusRow === 0) {
      startBenchmark();
    } else if (focusRow === 1) {
      startBenchmark();
    } else if (focusRow === 2 && recommendedQ) {
      onApplyPreset(recommendedQ, targetFps);
      setApplied(true);
    } else if (focusRow === 3) {
      onClose();
    }
  }, [confirmSignal, focusRow, running, recommendedQ, targetFps, onApplyPreset, onClose, startBenchmark]);

  useEffect(() => {
    if (!running) return;
    const canvas = stressCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 480;
    canvas.height = 270;

    const glow = document.createElement('canvas');
    glow.width = 128;
    glow.height = 128;
    const gctx = glow.getContext('2d')!;
    const grad = gctx.createRadialGradient(64, 64, 1, 64, 64, 64);
    grad.addColorStop(0, '#ffaa44');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 128, 128);

    const start = performance.now();
    const durationMs = 2800;
    let frames = 0;
    let animId = 0;

    const particles = Array.from({ length: 220 }, (_, i) => ({
      x: (i * 37) % 480,
      y: (i * 53) % 270,
      vx: ((i % 7) - 3) * 40,
      vy: ((i % 5) - 2) * 40,
    }));

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      ctx.fillStyle = '#111015';
      ctx.fillRect(0, 0, 480, 270);
      for (let y = 0; y < 270; y += 16) {
        for (let x = 0; x < 480; x += 16) {
          ctx.fillStyle = (x + y) % 32 === 0 ? '#1d1c22' : '#18171c';
          ctx.fillRect(x, y, 15, 15);
        }
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x = (p.x + p.vx * 0.016 + 480) % 480;
        p.y = (p.y + p.vy * 0.016 + 270) % 270;
        ctx.fillStyle = i % 2 === 0 ? '#ffb347' : '#6ce2ff';
        ctx.fillRect(p.x, p.y, 2, 2);
        if (i < 24) {
          ctx.drawImage(glow, p.x - 32, p.y - 32, 64, 64);
        }
      }
      ctx.restore();

      frames++;
      if (elapsed < durationMs) {
        animId = requestAnimationFrame(tick);
      } else {
        const measured = Math.max(15, Math.round((frames / elapsed) * 1000));
        const rec = pickRecommendedQuality(measured, targetFps);
        setAvgFps(measured);
        setRecommendedQ(rec);
        onHasResultChange(true);
        onFocusRow(2);
        setRunning(false);
        setApplied(false);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [running, targetFps, pickRecommendedQuality, onHasResultChange, onFocusRow]);

  return (
    <div className="bg-[#111014]/95 pixel-border-lit p-5 md:p-6 w-full max-w-lg text-left">
      <h3 className="font-pixel-title text-sm md:text-base text-[#f0c06e] mb-2 text-center">
        {t.benchTitle}
      </h3>
      <p className="text-xs text-[#a89f91] text-center mb-4 leading-relaxed">
        {t.benchDesc}
      </p>

      {/* Target FPS Selector (Focus Row 0) */}
      <div
        className={`mb-4 p-2 transition-all ${
          focusRow === 0 ? 'bg-[#1a1612] pixel-border-lit' : 'bg-transparent'
        }`}
      >
        <div className="text-xs text-[#8f877b] mb-2 text-center">
          {focusRow === 0 ? '▸ ' : ''}
          {t.benchTargetFps}
        </div>
        <div className="grid grid-cols-5 gap-2">
          {BENCH_FPS_TARGETS.map((fps) => (
            <button
              key={fps}
              disabled={running}
              onMouseEnter={() => onFocusRow(0)}
              onClick={() => {
                onFocusRow(0);
                onChangeTargetFps(fps);
                if (avgFps !== null) {
                  setRecommendedQ(pickRecommendedQuality(avgFps, fps));
                  setApplied(false);
                }
              }}
              className={`py-2 text-xs font-bold cursor-pointer tabular-nums ${
                targetFps === fps
                  ? 'bg-[#2a2115] text-[#ffd584] pixel-border-lit'
                  : 'bg-[#17161b] text-[#7c7469] pixel-border hover:text-white'
              }`}
            >
              {fps}
            </button>
          ))}
        </div>
      </div>

      {/* Live Preview Stress Canvas */}
      <div className="bg-[#09080b] pixel-border p-1.5 mb-4 relative">
        <canvas ref={stressCanvasRef} className="w-full h-24 object-cover pixelated block" />
        {running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#060608]/55">
            <span className="text-xs font-bold text-[#ffb84d] mb-1.5">
              {t.benchRunning} {progress}%
            </span>
            <div className="w-48 h-2 bg-[#1a181f] border border-[#38333f]">
              <div className="h-full bg-[#f0c06e]" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Results Box */}
      {avgFps !== null && recommendedQ && (
        <div className="bg-[#16151a] pixel-border p-3 mb-4 grid grid-cols-2 gap-3 text-xs tabular-nums">
          <div>
            <div className="text-[#8f877b]">{t.benchResultAvg}</div>
            <div className="text-base font-bold text-[#9bf5ff] mt-0.5">{avgFps} FPS</div>
          </div>
          <div>
            <div className="text-[#8f877b]">{t.benchResultRecommended}</div>
            <div className="text-base font-bold text-[#f0c06e] mt-0.5">
              {t.graphicsValues[recommendedQ]} · {targetFps} FPS
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          disabled={running}
          onMouseEnter={() => onFocusRow(1)}
          onClick={startBenchmark}
          className={`px-5 py-2.5 text-xs md:text-sm font-bold cursor-pointer disabled:opacity-50 transition-transform ${
            focusRow === 1
              ? 'bg-[#2a2115] text-[#fff2d1] pixel-border-lit scale-105'
              : 'bg-[#191614] text-[#cfc7b8] pixel-border'
          }`}
        >
          {focusRow === 1 ? '▸ ' : ''}
          {t.benchRunBtn}
        </button>

        {recommendedQ && (
          <button
            onMouseEnter={() => onFocusRow(2)}
            onClick={() => {
              onFocusRow(2);
              onApplyPreset(recommendedQ, targetFps);
              setApplied(true);
            }}
            className={`px-5 py-2.5 text-xs md:text-sm font-bold cursor-pointer transition-transform ${
              focusRow === 2
                ? 'bg-[#1b3320] text-[#a6ffb5] pixel-border-lit scale-105'
                : 'bg-[#152418] text-[#7ad68a] pixel-border'
            }`}
          >
            {focusRow === 2 ? '▸ ' : ''}
            {applied ? t.benchAppliedToast : t.benchApplyBtn}
          </button>
        )}

        <button
          disabled={running}
          onMouseEnter={() => onFocusRow(3)}
          onClick={onClose}
          className={`px-4 py-2.5 text-xs md:text-sm font-bold cursor-pointer transition-transform ${
            focusRow === 3
              ? 'bg-[#2a2115] text-[#fff2d1] pixel-border-lit scale-105'
              : 'bg-[#17161b] text-[#cfc7b8] pixel-border'
          }`}
        >
          {focusRow === 3 ? '▸ ' : ''}
          {glyphs.back} {t.back}
        </button>
      </div>

      <div className="mt-3 text-[11px] text-[#787066] text-center">
        D-Pad · {glyphs.confirm} · {glyphs.back}
      </div>
    </div>
  );
};
