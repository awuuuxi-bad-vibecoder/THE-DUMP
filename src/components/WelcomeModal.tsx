import React, { useEffect, useRef } from 'react';
import { getGlyphs, I18N, Lang } from '../game/i18n';
import { ControllerType, DifficultyMode, GameSettings, GraphicsQuality } from '../game/types';

export const WELCOME_TOTAL_STEPS = 6;

interface WelcomeModalProps {
  lang: Lang;
  settings: GameSettings;
  step: number; // 0..5
  onSetStep: (step: number) => void;
  onSetLang: (lang: Lang) => void;
  onSetController: (ct: ControllerType) => void;
  onSetDifficulty: (diff: DifficultyMode) => void;
  onSetQuality: (q: GraphicsQuality) => void;
  onConfirmEnter: () => void;
}

const DIFF_LIST: DifficultyMode[] = ['normal', 'hard', 'nightmare'];
const QUALITY_LIST: GraphicsQuality[] = ['high', 'medium', 'low'];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  lang,
  settings,
  step,
  onSetStep,
  onSetLang,
  onSetController,
  onSetDifficulty,
  onSetQuality,
  onConfirmEnter,
}) => {
  const t = I18N[lang];
  const glyphs = getGlyphs(settings.controllerType);
  const gfxPreviewRef = useRef<HTMLCanvasElement>(null);
  const guideCanvasRef = useRef<HTMLCanvasElement>(null);

  // Live visual Graphics Preview Canvas (Step 3)
  useEffect(() => {
    if (step !== 3) return;
    const canvas = gfxPreviewRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dims =
      settings.quality === 'high'
        ? { w: 192, h: 96 }
        : settings.quality === 'medium'
          ? { w: 144, h: 72 }
          : { w: 96, h: 48 };
    canvas.width = dims.w;
    canvas.height = dims.h;

    let animId = 0;
    const start = performance.now();

    const renderPreview = (now: number) => {
      const time = (now - start) * 0.001;
      const w = dims.w;
      const h = dims.h;
      ctx.imageSmoothingEnabled = false;

      // Basement tiles
      ctx.fillStyle = '#0d0c10';
      ctx.fillRect(0, 0, w, h);
      const ts = Math.max(8, Math.round(w / 12));
      for (let y = 0; y < h; y += ts) {
        for (let x = 0; x < w; x += ts) {
          ctx.fillStyle = ((x / ts + y / ts) & 1) === 0 ? '#1b191d' : '#161418';
          ctx.fillRect(x, y, ts - 1, ts - 1);
        }
      }

      // Player + Lamp in center
      const px = Math.round(w * 0.34);
      const py = Math.round(h * 0.54);
      const ex = Math.round(w * 0.68 + Math.sin(time * 2.2) * 4);
      const ey = Math.round(h * 0.52);

      // Sparks
      if (settings.quality !== 'low') {
        const g = ctx.createRadialGradient(px, py, 2, px, py, w * 0.42);
        g.addColorStop(0, 'rgba(255, 195, 95, 0.42)');
        g.addColorStop(0.55, 'rgba(235, 145, 50, 0.14)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.fillStyle = 'rgba(255, 185, 85, 0.16)';
        ctx.beginPath();
        ctx.arc(px, py, w * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Hero pixel sprite
      const unit = Math.max(2, Math.round(w / 48));
      ctx.fillStyle = '#333b42';
      ctx.fillRect(px - unit * 2, py - unit * 2, unit * 4, unit * 4);
      ctx.fillStyle = '#ffe28a';
      ctx.fillRect(px + unit * 2, py - unit, unit * 2, unit * 2);

      // Enemy + glint
      ctx.fillStyle = '#5c2026';
      ctx.fillRect(ex - unit * 2, ey - unit * 2, unit * 4, unit * 4);
      ctx.fillStyle = '#ff384d';
      ctx.fillRect(ex - unit, ey - unit * 2, unit * 2, unit);

      // Orbiting sparks
      for (let i = 0; i < (settings.quality === 'low' ? 3 : 8); i++) {
        const a = time * 2.5 + i * 0.9;
        const sx = Math.round(px + Math.cos(a) * (w * 0.18));
        const sy = Math.round(py + Math.sin(a * 1.3) * (h * 0.2));
        ctx.fillStyle = i % 2 === 0 ? '#ffd269' : '#80e5ff';
        ctx.fillRect(sx, sy, Math.max(1, unit >> 1), Math.max(1, unit >> 1));
      }

      animId = requestAnimationFrame(renderPreview);
    };

    animId = requestAnimationFrame(renderPreview);
    return () => cancelAnimationFrame(animId);
  }, [step, settings.quality]);

  // Live animated Combat Parry Guide Canvas (Step 4)
  useEffect(() => {
    if (step !== 4) return;
    const canvas = guideCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 220;
    const H = 68;
    canvas.width = W;
    canvas.height = H;

    let animId = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const cycle = ((now - start) * 0.001) % 3.2; // 3.2s demo loop
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#121016';
      ctx.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 16) {
        ctx.fillStyle = '#19161f';
        ctx.fillRect(x, 0, 15, H);
      }

      const px = 76;
      const py = 38;
      const ex = cycle < 1.3 ? 148 - cycle * 22 : cycle < 1.65 ? 119 : 138;
      const ey = 38;

      // Lamp warmth
      ctx.fillStyle = 'rgba(255, 190, 90, 0.14)';
      ctx.beginPath();
      ctx.arc(px, py, 44, 0, Math.PI * 2);
      ctx.fill();

      // Player
      ctx.fillStyle = '#36414a';
      ctx.fillRect(px - 6, py - 6, 12, 12);
      ctx.fillStyle = '#ffe28a';
      ctx.fillRect(px + 6, py - 2, 3, 3);

      // Enemy
      const staggered = cycle >= 1.45 && cycle < 2.6;
      ctx.fillStyle = staggered ? '#525b6e' : '#632229';
      ctx.fillRect(Math.round(ex) - 7, ey - 7, 14, 14);
      ctx.fillStyle = staggered ? '#ffe066' : '#ff2d44';
      ctx.fillRect(Math.round(ex) - 3, ey - 5, 4, 2);

      // Crimson glint phase (0.65s -> 1.45s)
      if (cycle >= 0.65 && cycle < 1.45) {
        const pulse = Math.sin(cycle * 35) > 0;
        const gx = Math.round(ex) - 10;
        ctx.fillStyle = pulse ? '#ff1f3d' : '#ff99a4';
        ctx.fillRect(gx - 7, ey, 15, 2);
        ctx.fillRect(gx, ey - 7, 2, 15);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(gx - 1, ey - 1, 3, 3);
      }

      // Parry cyan shockwave (1.45s -> 1.9s)
      if (cycle >= 1.45 && cycle < 1.95) {
        const prog = (cycle - 1.45) / 0.5;
        ctx.strokeStyle = '#9bf5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc((px + ex) * 0.5, py, 6 + prog * 28, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#9bf5ff';
        ctx.font = 'bold 9px "Pixelify Sans", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.parryShout, px, py - 14 - prog * 8);
      }

      // Riposte counter-slash (2.0s -> 2.4s)
      if (cycle >= 2.0 && cycle < 2.35) {
        ctx.strokeStyle = '#ffb347';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(px + 10, py, 24, -0.9, 0.9);
        ctx.stroke();
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [step, t.parryShout]);

  const diffData = t.welcomeSteps.diffBars[settings.difficulty];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6 bg-[#050507]/62">
      <div className="bg-[#121014]/96 pixel-border-lit w-full max-w-xl p-4 sm:p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.9)] flex flex-col max-h-[94vh] overflow-y-auto">
        {/* Step Progress Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="text-[11px] font-bold tracking-widest text-[#f0c06e]">
            {t.welcomeStepOf(step + 1, WELCOME_TOTAL_STEPS)}
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: WELCOME_TOTAL_STEPS }, (_, idx) => (
              <button
                key={idx}
                onClick={() => onSetStep(idx)}
                aria-label={`Step ${idx + 1}`}
                className={`h-2 transition-all cursor-pointer ${
                  idx === step
                    ? 'w-6 bg-[#f0c06e]'
                    : idx < step
                      ? 'w-3 bg-[#9e7738]'
                      : 'w-3 bg-[#2a252c]'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Title Header */}
        <h1 className="font-pixel-title text-sm sm:text-lg text-[#fff0d1] mb-1.5 drop-shadow-[2px_2px_0_#000]">
          {step === 0
            ? t.welcomeSteps.langTitle
            : step === 1
              ? t.welcomeSteps.padTitle
              : step === 2
                ? t.welcomeSteps.diffTitle
                : step === 3
                  ? t.welcomeSteps.gfxTitle
                  : step === 4
                    ? t.welcomeSteps.guideTitle
                    : t.welcomeSteps.readyTitle}
        </h1>
        <p className="text-xs text-[#bfb5a4] mb-4 leading-relaxed">
          {step === 0
            ? t.welcomeSteps.langDesc
            : step === 1
              ? t.welcomeSteps.padDesc
              : step === 2
                ? t.welcomeSteps.diffDesc
                : step === 3
                  ? t.welcomeSteps.gfxDesc
                  : step === 4
                    ? t.welcomeSteps.guideDesc
                    : t.welcomeSteps.readyDesc}
        </p>

        {/* STEP 0: LANGUAGE */}
        {step === 0 && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(['en', 'ru'] as Lang[]).map((l) => {
              const active = lang === l;
              return (
                <button
                  key={l}
                  onClick={() => onSetLang(l)}
                  className={`p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    active
                      ? 'bg-[#2b2114] text-[#fff2d1] pixel-border-lit scale-[1.02]'
                      : 'bg-[#17151a] text-[#9b9284] pixel-border hover:text-white'
                  }`}
                >
                  <span className="font-pixel-title text-sm sm:text-base">
                    {l === 'en' ? 'THE_DUMP' : 'ДЕ_ДАМП'}
                  </span>
                  <span className="text-xs font-bold text-[#ffb84d]">
                    {l === 'en' ? 'English' : 'Русский'}
                  </span>
                  <span className="text-[11px] text-[#a89f91]">
                    {l === 'en' ? 'Begin. Die. Repeat.' : 'Начни. Умри. Повтори.'}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* STEP 1: GAMEPAD + VISUAL LAYOUT */}
        {step === 1 && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(['ps', 'xbox'] as ControllerType[]).map((ct) => {
                const active = settings.controllerType === ct;
                return (
                  <button
                    key={ct}
                    onClick={() => onSetController(ct)}
                    className={`py-2.5 px-3 font-bold text-xs sm:text-sm cursor-pointer transition-all ${
                      active
                        ? 'bg-[#2b2114] text-[#fff2d1] pixel-border-lit scale-[1.02]'
                        : 'bg-[#17151a] text-[#9b9284] pixel-border hover:text-white'
                    }`}
                  >
                    {t.controllerValues[ct]}
                  </button>
                );
              })}
            </div>

            {/* Visual Gamepad Preview Box */}
            <div className="bg-[#0b0a0e] pixel-border p-3 flex flex-col sm:flex-row items-center justify-around gap-3">
              <div className="flex flex-col items-center gap-1 text-[11px]">
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-[#1b1a22] pixel-border text-[#9bf5ff] font-bold">
                    {settings.controllerType === 'xbox' ? 'LB' : 'L1'} · {t.hudParry}
                  </span>
                  <span className="px-2 py-0.5 bg-[#1b1a22] pixel-border text-[#6ce2ff] font-bold">
                    {glyphs.r1} · {t.hudAttackR1}
                  </span>
                  <span className="px-2 py-0.5 bg-[#1b1a22] pixel-border text-[#f0c06e] font-bold">
                    {glyphs.r2} · {t.hudAttackR2}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="w-10 h-10 rounded-full bg-[#1e1d24] border-2 border-[#46414f] flex items-center justify-center text-[10px] font-bold text-[#bfb5a4]">
                    {glyphs.moveStick === 'LS' ? 'LS' : 'L3'}
                  </div>
                  <div className="px-2 py-1 bg-[#191820] border border-[#3a3642] text-[10px] text-[#d6ccb8]">
                    {glyphs.bag}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-[#1e1d24] border-2 border-[#46414f] flex items-center justify-center text-[10px] font-bold text-[#ffb84d]">
                    {glyphs.aimStick === 'RS' ? 'RS' : 'R3'}
                  </div>
                </div>
              </div>

              {/* 4 Face Buttons Diamond */}
              <div className="grid grid-cols-3 gap-1 w-24 text-xs font-bold">
                <div />
                <div className="h-7 flex items-center justify-center bg-[#18261d] border border-[#3c734e] text-[#7ce38b]">
                  {glyphs.interact}
                </div>
                <div />
                <div className="h-7 flex items-center justify-center bg-[#23192b] border border-[#6e3a8c] text-[#df96ff]">
                  {glyphs.square}
                </div>
                <div />
                <div className="h-7 flex items-center justify-center bg-[#2d171a] border border-[#8f323b] text-[#ff737f]">
                  {glyphs.back}
                </div>
                <div />
                <div className="h-7 flex items-center justify-center bg-[#152236] border border-[#325f9e] text-[#78b8ff]">
                  {glyphs.confirm}
                </div>
                <div />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DIFFICULTY + VISUAL STAT BARS */}
        {step === 2 && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {DIFF_LIST.map((d) => {
                const active = settings.difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => onSetDifficulty(d)}
                    className={`py-2.5 px-2 font-bold text-xs sm:text-sm cursor-pointer transition-all ${
                      active
                        ? d === 'nightmare'
                          ? 'bg-[#361519] text-[#ff9ca3] pixel-border-lit scale-[1.02]'
                          : 'bg-[#2b2114] text-[#fff2d1] pixel-border-lit scale-[1.02]'
                        : 'bg-[#17151a] text-[#9b9284] pixel-border hover:text-white'
                    }`}
                  >
                    {t.difficultyValues[d]}
                  </button>
                );
              })}
            </div>

            <div className="bg-[#0b0a0e] pixel-border p-3 text-left space-y-2">
              {[
                { label: 'HP / Swarm', pct: diffData.hp, color: '#e04f4f' },
                { label: 'Speed', pct: diffData.speed, color: '#ffb347' },
                { label: 'Damage', pct: diffData.dmg, color: '#ff527d' },
              ].map((bar) => (
                <div key={bar.label} className="flex items-center gap-2 text-[11px]">
                  <span className="w-20 text-[#9e9587] font-bold">{bar.label}</span>
                  <div className="flex-1 h-2 bg-[#1a1820] border border-[#2f2b36]">
                    <div
                      className="h-full transition-all duration-200"
                      style={{ width: `${bar.pct}%`, backgroundColor: bar.color }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-[#cfc6b6] pt-1">{diffData.note}</p>
            </div>
          </div>
        )}

        {/* STEP 3: GRAPHICS + LIVE CELLAR PREVIEW */}
        {step === 3 && (
          <div className="mb-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {QUALITY_LIST.map((q) => {
                const active = settings.quality === q;
                return (
                  <button
                    key={q}
                    onClick={() => onSetQuality(q)}
                    className={`py-2 px-1.5 font-bold text-[11px] sm:text-xs cursor-pointer transition-all ${
                      active
                        ? 'bg-[#2b2114] text-[#fff2d1] pixel-border-lit scale-[1.02]'
                        : 'bg-[#17151a] text-[#9b9284] pixel-border hover:text-white'
                    }`}
                  >
                    {t.graphicsValues[q]}
                  </button>
                );
              })}
            </div>

            <div className="bg-[#09080b] pixel-border p-1.5">
              <canvas
                ref={gfxPreviewRef}
                className="w-full h-24 object-cover pixelated block"
              />
              <p className="text-[11px] text-[#cfc6b6] mt-2 px-1">
                {t.welcomeSteps.gfxNotes[settings.quality]}
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: VISUAL SURVIVAL GUIDE */}
        {step === 4 && (
          <div className="mb-4 space-y-2.5 text-left">
            <div className="bg-[#0b0a0e] pixel-border p-1.5">
              <canvas
                ref={guideCanvasRef}
                className="w-full h-16 object-cover pixelated block"
              />
            </div>

            <div className="bg-[#16141a] pixel-border p-2.5">
              <div className="text-xs font-bold text-[#9bf5ff] flex items-center justify-between">
                <span>{t.welcomeSteps.guideParryTitle}</span>
                <span className="text-[11px] text-[#ffb84d]">{glyphs.l1}</span>
              </div>
              <p className="text-[11px] text-[#bfb5a4] mt-0.5 leading-snug">
                {t.welcomeSteps.guideParryDesc}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="bg-[#16141a] pixel-border p-2.5">
                <div className="text-xs font-bold text-[#f0c06e]">{t.welcomeSteps.guideAimTitle}</div>
                <p className="text-[11px] text-[#bfb5a4] mt-0.5 leading-snug">
                  {t.welcomeSteps.guideAimDesc}
                </p>
              </div>
              <div className="bg-[#16141a] pixel-border p-2.5">
                <div className="text-xs font-bold text-[#7ce38b]">{t.welcomeSteps.guideLootTitle}</div>
                <p className="text-[11px] text-[#bfb5a4] mt-0.5 leading-snug">
                  {t.welcomeSteps.guideLootDesc}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SUMMARY & ENTER */}
        {step === 5 && (
          <div className="mb-4 grid grid-cols-2 gap-2 text-left text-xs">
            <div className="bg-[#16141a] pixel-border p-2.5">
              <div className="text-[#787066] text-[10px] uppercase">{t.languageLabel}</div>
              <div className="text-[#fff2d1] font-bold mt-0.5">{t.languageValue}</div>
            </div>
            <div className="bg-[#16141a] pixel-border p-2.5">
              <div className="text-[#787066] text-[10px] uppercase">{t.controllerLabel}</div>
              <div className="text-[#9bf5ff] font-bold mt-0.5">{t.controllerValues[settings.controllerType]}</div>
            </div>
            <div className="bg-[#16141a] pixel-border p-2.5">
              <div className="text-[#787066] text-[10px] uppercase">{t.difficultyLabel}</div>
              <div className="text-[#ff8a6b] font-bold mt-0.5">{t.difficultyValues[settings.difficulty]}</div>
            </div>
            <div className="bg-[#16141a] pixel-border p-2.5">
              <div className="text-[#787066] text-[10px] uppercase">{t.graphicsLabel}</div>
              <div className="text-[#f0c06e] font-bold mt-0.5">{t.graphicsValues[settings.quality]}</div>
            </div>
          </div>
        )}

        {/* Footer Wizard Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {step > 0 ? (
            <button
              onClick={() => onSetStep(step - 1)}
              className="px-4 py-2.5 bg-[#19171c] text-[#cfc7b8] pixel-border text-xs sm:text-sm font-bold cursor-pointer hover:text-white"
            >
              {glyphs.back} {t.welcomePrev}
            </button>
          ) : (
            <button
              onClick={onConfirmEnter}
              className="px-3 py-2.5 bg-[#151318] text-[#857b6d] pixel-border text-xs font-bold cursor-pointer hover:text-[#cfc7b8]"
            >
              {t.welcomeSkip}
            </button>
          )}

          {step < WELCOME_TOTAL_STEPS - 1 ? (
            <button
              onClick={() => onSetStep(step + 1)}
              className="flex-1 py-2.5 bg-[#2a2115] text-[#fff2d1] pixel-border-lit text-xs sm:text-sm font-bold cursor-pointer"
            >
              {t.welcomeNext} {glyphs.confirm} →
            </button>
          ) : (
            <button
              onClick={onConfirmEnter}
              className="flex-1 py-2.5 bg-[#362916] text-[#fff2d1] pixel-border-lit text-xs sm:text-sm font-bold cursor-pointer"
            >
              {glyphs.confirm} {t.welcomeStartBtn}
            </button>
          )}
        </div>

        <div className="mt-2.5 text-[10px] text-[#7c7469]">
          D-Pad ◂▸ · {glyphs.confirm} {t.welcomeNext} · {glyphs.back} {t.welcomePrev}
        </div>
      </div>
    </div>
  );
};
