import React, { useEffect, useRef } from 'react';
import { getGlyphs, I18N, Lang } from '../game/i18n';
import { SKILLS } from '../game/skills';
import { ControllerType, SkillId } from '../game/types';

interface SkillPreviewModalProps {
  skillId: SkillId;
  lang: Lang;
  controllerType: ControllerType;
  mode: 'ASK' | 'SHOW';
  selectedChoice: number;
  onSelectChoice: (idx: number) => void;
  onYes: () => void;
  onNo: () => void;
}

export const SkillPreviewModal: React.FC<SkillPreviewModalProps> = ({
  skillId,
  lang,
  controllerType,
  mode,
  selectedChoice,
  onSelectChoice,
  onYes,
  onNo,
}) => {
  const t = I18N[lang];
  const glyphs = getGlyphs(controllerType);
  const skDef = SKILLS[skillId];
  const skText = t.skills[skillId];
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (mode !== 'SHOW') return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 180;
    const H = 135;
    canvas.width = W;
    canvas.height = H;

    let animId = 0;
    let time = 0;
    let last = performance.now();

    const particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      time += dt;

      const cycle = time % 1.9;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#0c0b0f';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#18171c';
      for (let y = 16; y < H; y += 16) ctx.fillRect(0, y, W, 1);
      for (let x = 16; x < W; x += 16) ctx.fillRect(x, 0, 1, H);

      const dummies =
        skillId === 'whirlwind_rend'
          ? [
              { x: 90, y: 38 },
              { x: 126, y: 68 },
              { x: 54, y: 68 },
            ]
          : skillId === 'spark_nova_slash'
            ? [
                { x: 126, y: 44 },
                { x: 138, y: 68 },
                { x: 126, y: 92 },
              ]
            : [
                { x: 102, y: 68 },
                { x: 136, y: 68 },
              ];

      let px = 42;
      const py = 68;
      let hitActive = false;

      if (skillId === 'whirlwind_rend') {
        px = 90;
        if (cycle > 0.55 && cycle < 0.85) {
          hitActive = true;
          if (Math.random() < 0.7) {
            const a = Math.random() * Math.PI * 2;
            particles.push({
              x: px + Math.cos(a) * 18,
              y: py + Math.sin(a) * 18,
              vx: Math.cos(a) * 85,
              vy: Math.sin(a) * 85,
              life: 0.35,
              color: Math.random() < 0.5 ? '#ff9933' : '#ffe08a',
            });
          }
        }
      } else if (skillId === 'phantom_thrust') {
        if (cycle < 0.5) {
          px = 38;
        } else if (cycle < 0.72) {
          const prog = (cycle - 0.5) / 0.22;
          px = 38 + prog * 112;
          hitActive = true;
          particles.push({
            x: px,
            y: py + (Math.random() - 0.5) * 8,
            vx: -45,
            vy: (Math.random() - 0.5) * 30,
            life: 0.32,
            color: '#7ceeff',
          });
        } else if (cycle < 1.4) {
          px = 150;
        } else {
          const back = (cycle - 1.4) / 0.5;
          px = 150 - back * 112;
        }
      } else if (skillId === 'spark_nova_slash') {
        px = 42;
        if (cycle > 0.45 && cycle < 0.52 && Math.random() < 0.7) {
          for (const ang of [-0.4, -0.2, 0, 0.2, 0.4]) {
            particles.push({
              x: px + 10,
              y: py,
              vx: Math.cos(ang) * 155,
              vy: Math.sin(ang) * 155,
              life: 0.65,
              color: ang === 0 ? '#ffffff' : '#ffe05c',
            });
          }
        }
        if (cycle > 0.45 && cycle < 0.75) hitActive = true;
      } else if (skillId === 'heavy_breaker') {
        px = 76;
        if ((cycle > 0.45 && cycle < 0.68) || (cycle > 1.0 && cycle < 1.25)) {
          hitActive = true;
          if (Math.random() < 0.6) {
            const a = (Math.random() - 0.5) * 2.2;
            particles.push({
              x: px + 22,
              y: py,
              vx: Math.cos(a) * 85,
              vy: Math.sin(a) * 85,
              life: 0.3,
              color: '#ff7b3b',
            });
          }
        }
      } else if (skillId === 'twin_fangs') {
        px = 78;
        if (cycle % 0.42 < 0.16) {
          hitActive = true;
          if (Math.random() < 0.5) {
            particles.push({
              x: px + 16,
              y: py + (Math.random() - 0.5) * 12,
              vx: 40,
              vy: (Math.random() - 0.5) * 40,
              life: 0.22,
              color: '#ff4f79',
            });
          }
        }
      } else {
        px = 70;
        if (cycle > 0.5 && cycle < 0.75) hitActive = true;
      }

      const g = ctx.createRadialGradient(px, py, 4, px, py, 64);
      g.addColorStop(0, 'rgba(255, 190, 95, 0.22)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      for (const d of dummies) {
        const flash = hitActive && Math.hypot(px - d.x, py - d.y) < (skillId === 'spark_nova_slash' ? 110 : 50);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(d.x - 5, d.y + 4, 10, 4);
        ctx.fillStyle = flash ? '#ffffff' : '#6e2c2c';
        ctx.fillRect(d.x - 4, d.y - 5, 8, 9);
        ctx.fillStyle = flash ? '#ffffff' : '#ff4d4d';
        ctx.fillRect(d.x - 2, d.y - 3, 2, 1);
      }

      if (hitActive) {
        ctx.save();
        ctx.strokeStyle = skDef.color;
        ctx.lineWidth = skillId === 'heavy_breaker' ? 5 : 3;
        ctx.beginPath();
        if (skillId === 'whirlwind_rend') {
          ctx.arc(px, py, 36, 0, Math.PI * 2);
        } else if (skillId === 'phantom_thrust') {
          ctx.moveTo(38, py);
          ctx.lineTo(px + 12, py);
        } else {
          ctx.arc(px, py, skillId === 'heavy_breaker' ? 38 : 28, -1.1, 1.1);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.fillStyle = '#333b42';
      ctx.fillRect(Math.round(px) - 4, Math.round(py) - 4, 8, 8);
      ctx.fillStyle = '#24272d';
      ctx.fillRect(Math.round(px) - 3, Math.round(py) - 7, 6, 4);
      ctx.fillStyle = '#ffe28a';
      ctx.fillRect(Math.round(px) + 5, Math.round(py) - 1, 2, 2);

      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.life -= dt;
        if (pt.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        ctx.fillStyle = pt.color;
        ctx.fillRect(Math.round(pt.x), Math.round(pt.y), 2, 2);
      }

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [mode, skillId, skDef.color]);

  return (
    <div className="absolute inset-0 z-30 bg-[#050507]/85 flex items-center justify-center p-4 md:p-8">
      {mode === 'ASK' ? (
        <div className="bg-[#111014] pixel-border-lit p-6 md:p-8 max-w-md w-full text-center">
          <p className="text-xs tracking-[0.2em] text-[#ffb84d] uppercase mb-2">
            {t.skillBookTitle}
          </p>
          <h2 className="font-pixel-title text-lg md:text-xl mb-1" style={{ color: skDef.color }}>
            {skDef.symbol} {skText.name}
          </h2>
          <p className="text-xs text-[#9c9487] mb-3">
            {skDef.category === 'PRIMARY' ? t.skillCategoryPrimary : t.skillCategorySecondary}
          </p>
          <p className="text-sm md:text-base text-[#d6cec0] mb-6">
            {t.skillBookQuestion}
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onMouseEnter={() => onSelectChoice(0)}
              onClick={onYes}
              className={`px-7 py-2.5 text-sm md:text-base font-bold cursor-pointer whitespace-nowrap transition-all ${
                selectedChoice === 0
                  ? 'bg-[#2a2115] text-[#fff2d1] pixel-border-lit scale-105'
                  : 'bg-[#17161b] text-[#7a7368] pixel-border'
              }`}
            >
              {t.yes}
            </button>
            <button
              onMouseEnter={() => onSelectChoice(1)}
              onClick={onNo}
              className={`px-7 py-2.5 text-sm md:text-base font-bold cursor-pointer whitespace-nowrap transition-all ${
                selectedChoice === 1
                  ? 'bg-[#2a2115] text-[#fff2d1] pixel-border-lit scale-105'
                  : 'bg-[#17161b] text-[#7a7368] pixel-border'
              }`}
            >
              {t.no}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#111014] pixel-border-lit p-5 md:p-7 max-w-2xl w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-xs tracking-[0.18em] text-[#ffb84d] uppercase mb-1">
                {t.skillBookTitle} · {skDef.category === 'PRIMARY' ? t.skillCategoryPrimary : t.skillCategorySecondary}
              </p>
              <h2 className="font-pixel-title text-lg md:text-xl mb-3" style={{ color: skDef.color }}>
                {skDef.symbol} {skText.name}
              </h2>
              <p className="text-sm text-[#d6cec0] leading-relaxed mb-4">
                {skText.fullDesc}
              </p>
              <div className="text-xs text-[#9c9487] space-y-1 border-t border-[#26232b] pt-3">
                <div>CD: {skDef.cooldown.toFixed(2)}s · Dash: {skDef.staminaCost}</div>
                <div className="text-[#f0c06e]">{t.skillPreviewHint}</div>
              </div>
              <button
                onClick={onNo}
                className="mt-5 px-6 py-2.5 bg-[#2a2115] text-[#fff2d1] pixel-border-lit text-sm font-bold cursor-pointer whitespace-nowrap"
              >
                {glyphs.confirm} {t.close}
              </button>
            </div>

            <div className="bg-[#09080b] pixel-border p-2">
              <canvas
                ref={previewCanvasRef}
                className="w-full aspect-[4/3] pixelated"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
