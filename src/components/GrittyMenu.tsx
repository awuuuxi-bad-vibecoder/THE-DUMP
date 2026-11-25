import React, { useEffect, useRef, useState } from 'react';
import { ARTIFACT_IDS, ARTIFACTS } from '../game/artifacts';
import { getGlyphs, I18N, Lang } from '../game/i18n';
import {
  ArtifactDef,
  ControllerType,
  DeepSettings,
  GameScreenState,
  GraphicsQuality,
  TargetFpsOption,
} from '../game/types';
import { BenchmarkModal } from './BenchmarkModal';
import { TrailerModal } from './TrailerModal';

export interface MenuButtonDef {
  id: string;
  label: string;
  valueText?: string;
  action: () => void;
}

export type MenuSubView = 'MAIN' | 'SETTINGS' | 'DEEP_SETTINGS' | 'CONTROLS' | 'BENCH' | 'TRAILER';

interface GrittyMenuProps {
  screen: Exclude<GameScreenState, 'PLAYING'>;
  subView: MenuSubView;
  lang: Lang;
  controllerType: ControllerType;
  selectedIndex: number;
  onSelectIndex: (idx: number) => void;
  onColsChange?: (cols: number) => void;
  buttons: MenuButtonDef[];
  deepSettings: DeepSettings;
  benchTargetFps: TargetFpsOption;
  benchFocusRow: number;
  benchConfirmSignal: number;
  onBenchFocusRow: (row: number) => void;
  onBenchHasResultChange: (hasResult: boolean) => void;
  onChangeBenchTargetFps: (fps: TargetFpsOption) => void;
  onApplyBenchPreset: (quality: GraphicsQuality, fpsLimit: TargetFpsOption) => void;
  trailerRestartSignal: number;
  stats: {
    floor: number;
    kills: number;
    parries: number;
    timeSurvived: number;
    artifacts: Array<{ def: ArtifactDef; count: number }>;
  };
  onCloseControls: () => void;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const GrittyMenu: React.FC<GrittyMenuProps> = ({
  screen,
  subView,
  lang,
  controllerType,
  selectedIndex,
  onSelectIndex,
  onColsChange,
  buttons,
  deepSettings,
  benchTargetFps,
  benchFocusRow,
  benchConfirmSignal,
  onBenchFocusRow,
  onBenchHasResultChange,
  onChangeBenchTargetFps,
  onApplyBenchPreset,
  trailerRestartSignal,
  stats,
  onCloseControls,
}) => {
  const t = I18N[lang];
  const glyphs = getGlyphs(controllerType);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const [beamTarget, setBeamTarget] = useState({ x: 400, y: 300 });
  const beamTargetRef = useRef({ x: 400, y: 300 });
  const screenRef = useRef(screen);
  const subViewRef = useRef(subView);
  const [cols, setCols] = useState(1);
  const [floatingTips, setFloatingTips] = useState<
    Array<{ id: number; text: string; side: 'left' | 'right'; topPct: number }>
  >([]);

  useEffect(() => {
    beamTargetRef.current = beamTarget;
  }, [beamTarget]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    subViewRef.current = subView;
  }, [subView]);

  // Overflow anomaly detector: auto-split into 2 or 3 columns when buttons would exceed viewport height!
  useEffect(() => {
    const recomputeCols = () => {
      if (subView !== 'SETTINGS' && subView !== 'DEEP_SETTINGS') {
        setCols(1);
        onColsChange?.(1);
        return;
      }
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const headerAndPadding = 165;
      const availH = Math.max(180, vh - headerAndPadding);
      const rowH = 54;
      const maxRowsPerCol = Math.max(2, Math.floor(availH / rowH));
      let neededCols = Math.ceil(buttons.length / maxRowsPerCol);
      if (vw < 540) neededCols = Math.min(2, neededCols);
      const clampedCols = Math.max(1, Math.min(3, neededCols));
      setCols(clampedCols);
      onColsChange?.(clampedCols);
    };

    recomputeCols();
    window.addEventListener('resize', recomputeCols);
    return () => window.removeEventListener('resize', recomputeCols);
  }, [buttons.length, subView, onColsChange]);

  // Measure selected button for frontal camera spotlight
  useEffect(() => {
    const updateTarget = () => {
      const btn = buttonRefs.current[selectedIndex];
      const box = containerRef.current;
      if (!btn || !box) return;
      const bRect = btn.getBoundingClientRect();
      const cRect = box.getBoundingClientRect();
      setBeamTarget({
        x: bRect.left - cRect.left + bRect.width * 0.5,
        y: bRect.top - cRect.top + bRect.height * 0.5,
      });
    };
    const id = requestAnimationFrame(updateTarget);
    window.addEventListener('resize', updateTarget);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', updateTarget);
    };
  }, [selectedIndex, screen, subView, buttons.length, cols]);

  // Periodically spawn atmospheric drifting tips along edges
  useEffect(() => {
    let tipCounter = 0;
    const spawnTip = () => {
      const list = I18N[lang].menuTips;
      const text = list[tipCounter % list.length];
      const side: 'left' | 'right' = tipCounter % 2 === 0 ? 'left' : 'right';
      const topPct = 18 + ((tipCounter * 23) % 62);
      tipCounter += 1;
      setFloatingTips((prev) => [...prev.slice(-1), { id: tipCounter, text, side, topPct }]);
    };
    spawnTip();
    const id = window.setInterval(spawnTip, 4800);
    return () => clearInterval(id);
  }, [lang]);

  // Persistent overlay canvas: peripheral artifacts, sparks, & smooth camera spotlight (never resets on hover/click!)
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 320;
    const H = 180;
    canvas.width = W;
    canvas.height = H;

    // Pre-bake radial spotlight sprite once for ultra-light rendering
    const spotSprite = document.createElement('canvas');
    spotSprite.width = 128;
    spotSprite.height = 128;
    const sctx = spotSprite.getContext('2d')!;
    const grad = sctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 240, 196, 0.30)');
    grad.addColorStop(0.65, 'rgba(235, 175, 88, 0.11)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 128);

    const motes = Array.from({ length: 42 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 8,
      vy: -3 - Math.random() * 6,
      size: Math.random() < 0.25 ? 2 : 1,
    }));

    const drifters = Array.from({ length: 6 }, (_, i) => {
      const sideLeft = i % 2 === 0;
      const artId = ARTIFACT_IDS[i % ARTIFACT_IDS.length];
      return {
        x: sideLeft ? 14 + Math.random() * 44 : W - 14 - Math.random() * 44,
        y: Math.random() * H,
        vy: -7 - Math.random() * 6,
        phase: Math.random() * Math.PI * 2,
        color: ARTIFACTS[artId].color,
        symbol: ARTIFACTS[artId].symbol,
        sideLeft,
      };
    });

    const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
    let curX = W * 0.5;
    let curY = H * 0.52;
    let animId = 0;
    let last = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const box = containerRef.current;
      const curScreen = screenRef.current;
      const curSub = subViewRef.current;
      const bt = beamTargetRef.current;
      const scaleX = box && box.clientWidth > 0 ? W / box.clientWidth : 1;
      const scaleY = box && box.clientHeight > 0 ? H / box.clientHeight : 1;
      const centeredSub = curSub === 'CONTROLS' || curSub === 'BENCH' || curSub === 'TRAILER';
      const tx = centeredSub ? W * 0.5 : bt.x * scaleX;
      const ty = centeredSub ? H * 0.5 : bt.y * scaleY;

      const lerpAmt = Math.min(1, dt * 11);
      curX += (tx - curX) * lerpAmt;
      curY += (ty - curY) * lerpAmt;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = curScreen !== 'TITLE_MENU' ? 'rgba(6, 6, 9, 0.72)' : 'rgba(5, 5, 8, 0.28)';
      ctx.fillRect(0, 0, W, H);

      // Peripheral drifting artifacts (uninterrupted across hovers/clicks)
      ctx.font = '8px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i < drifters.length; i++) {
        const d = drifters[i];
        d.y += d.vy * dt;
        d.phase += dt * 2;
        if (d.y < -12) {
          d.y = H + 12;
          d.x = d.sideLeft ? 16 + Math.random() * 44 : W - 16 - Math.random() * 44;
        }
        const sx = Math.round(d.x + Math.sin(d.phase) * 5);
        const sy = Math.round(d.y);
        ctx.globalAlpha = 0.2 + Math.sin(d.phase * 2) * 0.06;
        ctx.fillStyle = d.color;
        ctx.fillRect(sx - 5, sy - 6, 10, 10);
        ctx.globalAlpha = 0.62;
        ctx.fillText(d.symbol, sx, sy + 2);
      }
      ctx.globalAlpha = 1;

      if (Math.random() < 0.05) {
        const leftSide = Math.random() < 0.5;
        const sx = leftSide ? 10 + Math.random() * 48 : W - 10 - Math.random() * 48;
        const sy = 20 + Math.random() * (H - 40);
        for (let k = 0; k < 4; k++) {
          sparks.push({
            x: sx,
            y: sy,
            vx: (Math.random() - 0.5) * 40,
            vy: -10 - Math.random() * 35,
            life: 0.45 + Math.random() * 0.35,
            color: k % 2 === 0 ? '#ffb347' : '#80e5ff',
          });
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life -= dt;
        if (sp.life <= 0) {
          const lastIdx = sparks.length - 1;
          if (i !== lastIdx) sparks[i] = sparks[lastIdx];
          sparks.pop();
          continue;
        }
        sp.vy += 45 * dt;
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        ctx.fillStyle = sp.color;
        ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 1, 1);
      }

      // Frontal camera spotlight smoothly following from previous position
      const flicker = 0.95 + Math.sin(now * 0.017) * 0.025 + Math.sin(now * 0.043) * 0.025;
      ctx.globalAlpha = flicker;
      ctx.drawImage(spotSprite, curX - 64, curY - 64, 128, 128);
      ctx.globalAlpha = 1;

      const spotSq = 64 * 64;
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.y < 0) m.y = H;
        if (m.x < 0) m.x = W;
        if (m.x > W) m.x = 0;
        const dx = m.x - curX;
        const dy = m.y - curY;
        ctx.fillStyle = dx * dx + dy * dy < spotSq ? 'rgba(255, 228, 165, 0.8)' : 'rgba(130, 118, 102, 0.28)';
        ctx.fillRect(Math.round(m.x), Math.round(m.y), m.size, m.size);
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, []);

  const isMainSignboard = screen === 'TITLE_MENU' && subView === 'MAIN';

  const buttonGridClass =
    cols === 3
      ? 'grid grid-cols-3 gap-2.5 w-full max-w-4xl'
      : cols === 2
        ? 'grid grid-cols-2 gap-2.5 w-full max-w-2xl'
        : 'flex flex-col items-center gap-2.5 w-full';

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 md:p-6 overflow-hidden"
    >
      {/* Overlay VFX & Spotlight Canvas */}
      <canvas
        ref={bgCanvasRef}
        className="absolute inset-0 w-full h-full pixelated pointer-events-none"
      />

      {/* Peripheral Drifting Tips */}
      {subView === 'MAIN' &&
        floatingTips.map((tip) => (
          <div
            key={tip.id}
            className={`hidden lg:block pointer-events-none absolute max-w-[210px] text-xs leading-snug text-[#d6cec0]/75 drop-shadow-[1px_1px_0_#000] transition-opacity duration-700 ${
              tip.side === 'left' ? 'left-8 text-left' : 'right-8 text-right'
            }`}
            style={{ top: `${tip.topPct}%` }}
          >
            {tip.text}
          </div>
        ))}

      {/* Hanging Swaying Signboard (Title Menu) OR Standard Submenu Container */}
      <div
        className={`relative z-10 w-full flex flex-col items-center text-center ${
          isMainSignboard ? 'max-w-md origin-top animate-[signSway_5.5s_ease-in-out_infinite]' : 'max-w-4xl'
        }`}
      >
        {/* Pixel Iron Chains suspending the swaying signboard above the lit cellar */}
        {isMainSignboard && (
          <div className="flex items-end justify-between w-56 sm:w-64 -mb-1 pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="w-1.5 h-8 bg-[#3d3630] border-x border-[#121012]" />
              <div className="w-3 h-2 bg-[#7a5b32] border border-[#14110d]" />
            </div>
            <div className="flex flex-col items-center">
              <div className="w-1.5 h-8 bg-[#3d3630] border-x border-[#121012]" />
              <div className="w-3 h-2 bg-[#7a5b32] border border-[#14110d]" />
            </div>
          </div>
        )}

        <div
          className={
            isMainSignboard
              ? 'w-full bg-[#141110]/94 pixel-border-lit px-6 py-7 shadow-[0_18px_40px_rgba(0,0,0,0.85)]'
              : 'w-full flex flex-col items-center'
          }
        >
          {/* Header */}
          {subView === 'SETTINGS' ? (
            <h2 className="font-pixel-title text-lg md:text-2xl text-[#e8dfd1] mb-4 drop-shadow-[3px_3px_0_#000]">
              {t.settingsTitle}
            </h2>
          ) : subView === 'DEEP_SETTINGS' ? (
            <div className="mb-4">
              <h2 className="font-pixel-title text-base md:text-xl text-[#f0c06e] drop-shadow-[3px_3px_0_#000]">
                {t.deepSettingsTitle}
              </h2>
              <p className="text-xs text-[#8a8277] mt-1">{t.deepWipNote}</p>
            </div>
          ) : subView === 'CONTROLS' || subView === 'BENCH' || subView === 'TRAILER' ? null : screen === 'TITLE_MENU' ? (
            <h1 className="font-pixel-title text-2xl sm:text-3xl md:text-4xl text-[#f0dec0] leading-tight tracking-tight mb-6 drop-shadow-[4px_4px_0_#000]">
              {t.gameTitle}
            </h1>
          ) : screen === 'PAUSED' ? (
            <h2 className="font-pixel-title text-2xl md:text-3xl text-[#e8dfd1] mb-6 drop-shadow-[3px_3px_0_#000]">
              {t.paused}
            </h2>
          ) : (
            <div className="mb-6 w-full max-w-lg">
              <p className="text-xs text-[#c93838] tracking-[0.2em] uppercase mb-2">
                {t.lightWentOut}
              </p>
              <h2 className="font-pixel-title text-xl sm:text-2xl md:text-3xl text-[#e04848] drop-shadow-[3px_3px_0_#000]">
                {t.gameOver}
              </h2>
              <div className="mt-4 grid grid-cols-4 gap-3 border-y border-[#2b2622] py-3 text-xs sm:text-sm tabular-nums bg-[#0b0a0d]/80">
                <div>
                  <div className="text-[#787066]">{t.statFloor}</div>
                  <div className="text-lg text-[#e8dfd1] font-bold">{stats.floor}</div>
                </div>
                <div>
                  <div className="text-[#787066]">{t.statTime}</div>
                  <div className="text-lg text-[#e8dfd1] font-bold">{formatTime(stats.timeSurvived)}</div>
                </div>
                <div>
                  <div className="text-[#787066]">{t.statKills}</div>
                  <div className="text-lg text-[#e8dfd1] font-bold">{stats.kills}</div>
                </div>
                <div>
                  <div className="text-[#787066]">{t.statParries}</div>
                  <div className="text-lg text-[#9bf5ff] font-bold">{stats.parries}</div>
                </div>
              </div>
              {stats.artifacts.length > 0 && (
                <div className="mt-3 text-xs text-[#a89f91] flex flex-wrap justify-center gap-x-3 gap-y-1">
                  <span>{t.statArtifacts}:</span>
                  {stats.artifacts.map((a) => (
                    <span key={a.def.id} style={{ color: a.def.color }}>
                      {a.def.symbol} {a.def.name}{a.count > 1 ? ` ×${a.count}` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-view Body */}
          {subView === 'TRAILER' ? (
            <TrailerModal
              lang={lang}
              controllerType={controllerType}
              restartSignal={trailerRestartSignal}
              onClose={onCloseControls}
            />
          ) : subView === 'BENCH' ? (
            <BenchmarkModal
              lang={lang}
              controllerType={controllerType}
              targetFps={benchTargetFps}
              focusRow={benchFocusRow}
              confirmSignal={benchConfirmSignal}
              onFocusRow={onBenchFocusRow}
              onHasResultChange={onBenchHasResultChange}
              onChangeTargetFps={onChangeBenchTargetFps}
              onApplyPreset={onApplyBenchPreset}
              onClose={onCloseControls}
            />
          ) : subView === 'CONTROLS' ? (
            <div className="bg-[#111014]/95 pixel-border p-5 md:p-6 w-full max-w-md text-left">
              <h3 className="font-pixel-title text-sm text-[#f0c06e] mb-4 text-center">
                {t.controlsTitle}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-[#232026] pb-1">
                  <span className="text-[#8f877b]">{glyphs.moveStick}</span>
                  <span className="text-[#e8dfd1]">{t.ctrlMoveDesc}</span>
                </div>
                <div className="flex justify-between border-b border-[#232026] pb-1">
                  <span className="text-[#8f877b]">{glyphs.aimStick}</span>
                  <span className="text-[#e8dfd1]">{t.ctrlAimDesc}</span>
                </div>
                <div className="flex justify-between border-b border-[#232026] pb-1">
                  <span className="text-[#f0c06e]">{glyphs.r2} / {glyphs.square}</span>
                  <span className="text-[#e8dfd1]">{t.ctrlR2Desc}</span>
                </div>
                <div className="flex justify-between border-b border-[#232026] pb-1">
                  <span className="text-[#6ce2ff]">{glyphs.r1}</span>
                  <span className="text-[#e8dfd1]">{t.ctrlR1Desc}</span>
                </div>
                <div className="flex justify-between border-b border-[#232026] pb-1">
                  <span className="text-[#9bf5ff]">{glyphs.l1}</span>
                  <span className="text-[#e8dfd1]">{t.ctrlParryDesc}</span>
                </div>
                <div className="flex justify-between border-b border-[#232026] pb-1">
                  <span className="text-[#78b8ff]">{glyphs.confirm}</span>
                  <span className="text-[#e8dfd1]">{t.ctrlDashDesc}</span>
                </div>
                <div className="flex justify-between border-b border-[#232026] pb-1">
                  <span className="text-[#7ce38b]">{glyphs.interact}</span>
                  <span className="text-[#e8dfd1]">{t.ctrlLootDesc}</span>
                </div>
                <div className="flex justify-between border-b border-[#232026] pb-1">
                  <span className="text-[#d6ccb8]">{glyphs.bag}</span>
                  <span className="text-[#e8dfd1]">{t.ctrlInvDesc}</span>
                </div>
                <div className="flex justify-between pt-1 text-xs">
                  <span className="text-[#787066]">{t.ctrlKb}</span>
                  <span className="text-[#a89f91] text-right">{t.ctrlKbDesc}</span>
                </div>
              </div>
              <div className="mt-5 flex justify-center">
                <button
                  onClick={onCloseControls}
                  className="px-6 py-2.5 bg-[#2a2216] text-[#ffd584] pixel-border-lit text-sm font-bold cursor-pointer whitespace-nowrap"
                >
                  {glyphs.back} {t.back}
                </button>
              </div>
            </div>
          ) : (
            <div className={buttonGridClass}>
              {buttons.map((btn, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={btn.id}
                    ref={(el) => {
                      buttonRefs.current[idx] = el;
                    }}
                    onMouseEnter={() => onSelectIndex(idx)}
                    onClick={btn.action}
                    className={`relative px-4 py-2.5 transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center justify-between gap-2 ${
                      cols === 1 ? 'w-72 sm:w-80 mx-auto' : 'w-full'
                    } ${
                      isSelected
                        ? 'bg-[#2a2115]/95 text-[#fff2d1] pixel-border-lit scale-[1.02]'
                        : 'bg-[#100f12]/80 text-[#787066] pixel-border opacity-75 hover:opacity-95'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold tracking-wide truncate">
                      {btn.label}
                    </span>
                    <span className="text-xs font-bold text-[#ffb84d] shrink-0">
                      {btn.valueText ?? (isSelected ? glyphs.confirm : '')}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tagline underneath inside signboard */}
          {isMainSignboard && (
            <p className="mt-6 text-xs tracking-[0.18em] text-[#857a6d]">
              {t.tagline}
            </p>
          )}

          {subView === 'DEEP_SETTINGS' && (
            <p className="mt-3 text-xs text-[#6e665c]">
              {deepSettings.callsign} · {Math.round(deepSettings.stretchX * 100)}%
            </p>
          )}
        </div>
      </div>

      {/* Build version badge */}
      <div className="pointer-events-none absolute bottom-3 right-4 z-10 text-[11px] tracking-[0.18em] text-[#736b61]/80 drop-shadow-[1px_1px_0_#000]">
        v1.0
      </div>
    </div>
  );
};
