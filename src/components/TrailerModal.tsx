import React, { useEffect, useRef, useState } from 'react';
import { getGlyphs, I18N, Lang } from '../game/i18n';
import { ControllerType } from '../game/types';

interface TrailerModalProps {
  lang: Lang;
  controllerType: ControllerType;
  restartSignal: number;
  onClose: () => void;
}

const TRAILER_DURATION = 18.0;

export const TrailerModal: React.FC<TrailerModalProps> = ({
  lang,
  controllerType,
  restartSignal,
  onClose,
}) => {
  const t = I18N[lang];
  const glyphs = getGlyphs(controllerType);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [caption, setCaption] = useState(t.trailerScenes[0]);
  const [progress, setProgress] = useState(0);
  const timeRef = useRef(0);

  useEffect(() => {
    timeRef.current = 0;
  }, [restartSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 320;
    const H = 180;
    canvas.width = W;
    canvas.height = H;

    const sparks: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }> = [];
    let animId = 0;
    let last = performance.now();
    let captionIdx = -1;

    const spawnBurst = (x: number, y: number, count: number, colorA: string, colorB: string) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 45 + Math.random() * 125;
        sparks.push({
          x,
          y,
          vx: Math.cos(a) * spd,
          vy: Math.sin(a) * spd,
          life: 0.35 + Math.random() * 0.3,
          color: i % 2 === 0 ? colorA : colorB,
        });
      }
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      timeRef.current = (timeRef.current + dt) % TRAILER_DURATION;
      const cur = timeRef.current;

      setProgress(Math.round((cur / TRAILER_DURATION) * 100));

      const sIdx =
        cur < 3.0 ? 0 : cur < 6.0 ? 1 : cur < 9.2 ? 2 : cur < 12.6 ? 3 : cur < 15.6 ? 4 : 5;
      if (sIdx !== captionIdx) {
        captionIdx = sIdx;
        setCaption(t.trailerScenes[sIdx] ?? '');
      }

      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#09080c';
      ctx.fillRect(0, 0, W, H);

      // Basement tiled floor
      for (let ty = 0; ty < H; ty += 16) {
        for (let tx = 0; tx < W; tx += 16) {
          ctx.fillStyle = ((tx + ty) / 16) % 2 === 0 ? '#1b1a1f' : '#17161b';
          ctx.fillRect(tx, ty, 15, 15);
        }
      }

      // Grated center stripe
      ctx.fillStyle = '#25211e';
      ctx.fillRect(0, 74, W, 32);
      for (let gx = 4; gx < W; gx += 8) {
        ctx.fillStyle = '#141216';
        ctx.fillRect(gx, 76, 3, 28);
      }

      // Scene choreography
      let px = W * 0.5;
      const py = 92;
      let flashAlpha = 0;

      if (sIdx === 0) {
        px = 50 + (cur / 3.0) * 110;
      } else if (sIdx === 1) {
        px = 160 + Math.sin(cur * 3) * 18;
        // Shadow stalkers lurking at right
        for (let e = 0; e < 2; e++) {
          const ex = 250 + e * 24 - (cur - 3) * 16;
          const ey = 74 + e * 30;
          ctx.fillStyle = '#5c1f24';
          ctx.fillRect(Math.round(ex) - 5, Math.round(ey) - 6, 10, 12);
          ctx.fillStyle = '#ff384c';
          ctx.fillRect(Math.round(ex) - 3, Math.round(ey) - 3, 2, 2);
        }
      } else if (sIdx === 2) {
        // Parry shock scene
        px = 138;
        const ex = 195 - Math.max(0, (cur - 6.0) * 24);
        const parryMoment = cur > 7.35 && cur < 7.85;
        ctx.fillStyle = parryMoment ? '#ffffff' : '#6e2329';
        ctx.fillRect(Math.round(ex) - 6, py - 7, 12, 14);
        if (cur >= 6.7 && cur < 7.35) {
          ctx.fillStyle = '#ff243c';
          ctx.fillRect(Math.round(ex) - 2, py - 14, 4, 4);
        }
        if (parryMoment) {
          flashAlpha = 0.25;
          ctx.strokeStyle = '#9bf5ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(162, py, (cur - 7.35) * 90 + 10, 0, Math.PI * 2);
          ctx.stroke();
          if (Math.random() < 0.7) spawnBurst(162, py, 3, '#9bf5ff', '#ffd25a');
        }
      } else if (sIdx === 3) {
        // Whirlwind + Spark Nova carnage
        px = 120 + (cur - 9.2) * 28;
        const spin = (cur - 9.2) * 12;
        ctx.strokeStyle = '#ff9038';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(Math.round(px), py, 36, spin, spin + Math.PI * 1.6);
        ctx.stroke();
        if (Math.random() < 0.45) spawnBurst(px + 12, py, 2, '#ffe05c', '#ff6a2b');
        // Golden artifact drop
        ctx.fillStyle = '#ffd25a';
        ctx.fillRect(228, 86 + Math.round(Math.sin(cur * 6) * 2), 8, 8);
      } else if (sIdx === 4) {
        // Overlord Boss encounter
        px = 96;
        const bx = 220 + Math.sin(cur * 5) * 10;
        ctx.fillStyle = '#401417';
        ctx.fillRect(Math.round(bx) - 14, py - 16, 28, 32);
        ctx.fillStyle = '#ff6a2b';
        ctx.fillRect(Math.round(bx) - 10, py - 10, 6, 4);
        ctx.fillRect(Math.round(bx) + 4, py - 10, 6, 4);
        if (Math.floor(cur * 4) % 2 === 0) {
          ctx.strokeStyle = '#ff4d36';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(Math.round(bx), py, ((cur * 4) % 1) * 58 + 12, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // Finale ember backdrop
        px = 160;
        if (Math.random() < 0.35) {
          sparks.push({
            x: Math.random() * W,
            y: H,
            vx: (Math.random() - 0.5) * 24,
            vy: -40 - Math.random() * 45,
            life: 1.1,
            color: Math.random() < 0.5 ? '#ffb347' : '#ff6a2b',
          });
        }
      }

      // Draw runner seq & brass lamp glow
      if (sIdx < 5) {
        const g = ctx.createRadialGradient(px, py, 4, px, py, 92);
        g.addColorStop(0, 'rgba(255, 194, 102, 0.28)');
        g.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(Math.round(px) - 5, py + 5, 10, 4);
        ctx.fillStyle = '#333b42';
        ctx.fillRect(Math.round(px) - 4, py - 5, 8, 9);
        ctx.fillStyle = '#24272d';
        ctx.fillRect(Math.round(px) - 3, py - 8, 6, 4);
        ctx.fillStyle = '#ffd87a';
        ctx.fillRect(Math.round(px) + 5, py - 1, 3, 3);
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life -= dt;
        if (sp.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        ctx.fillStyle = sp.color;
        ctx.fillRect(Math.round(sp.x), Math.round(sp.y), 2, 2);
      }

      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(180, 244, 255, ${flashAlpha})`;
        ctx.fillRect(0, 0, W, H);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [t.trailerScenes]);

  return (
    <div className="bg-[#0e0d12]/96 pixel-border-lit p-4 md:p-6 w-full max-w-2xl text-center">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel-title text-xs md:text-base text-[#f0c06e]">
          {t.trailerTitle}
        </h3>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-[#1b1920] text-[#d6cec0] hover:text-white pixel-border text-xs cursor-pointer"
        >
          {glyphs.back} {t.back}
        </button>
      </div>

      <div className="relative bg-[#070609] pixel-border overflow-hidden">
        <canvas ref={canvasRef} className="w-full aspect-[16/9] pixelated block" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-4 py-4">
          <div className="font-pixel-title text-xs sm:text-sm md:text-base text-[#fff2d1] drop-shadow-[2px_2px_0_#000]">
            {caption}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#17151b] border border-[#2f2a35] mt-3">
        <div className="h-full bg-[#f0c06e] transition-all duration-75" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] text-[#8f877b]">{t.trailerHint}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              timeRef.current = 0;
            }}
            className="px-4 py-2 bg-[#2a2115] text-[#fff2d1] pixel-border-lit text-xs font-bold cursor-pointer"
          >
            {glyphs.confirm} Replay
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#17161b] text-[#cfc7b8] pixel-border text-xs font-bold cursor-pointer"
          >
            {glyphs.back} {t.back}
          </button>
        </div>
      </div>
    </div>
  );
};
