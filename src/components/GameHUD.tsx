import React from 'react';
import { getGlyphs, I18N, Lang } from '../game/i18n';
import { SKILLS } from '../game/skills';
import { GameSettings, HUDState } from '../game/types';

interface GameHUDProps {
  hud: HUDState;
  lang: Lang;
  settings: GameSettings;
  measuredFps: number;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const GameHUD: React.FC<GameHUDProps> = ({ hud, lang, settings, measuredFps }) => {
  const t = I18N[lang];
  const glyphs = getGlyphs(settings.controllerType);
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stamina / Math.max(1, hud.maxStamina)) * 100));
  const lampPct = Math.max(0, Math.min(100, hud.lampFuel));

  const r2Def = SKILLS[hud.slotR2];
  const r1Def = hud.slotR1 ? SKILLS[hud.slotR1] : null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-5 origin-top-left"
      style={{
        opacity: settings.uiOpacity,
      }}
    >
      {/* Top Bar */}
      <div
        className="flex items-start justify-between gap-4"
        style={{
          transform: settings.uiScale !== 1 ? `scale(${settings.uiScale})` : undefined,
          transformOrigin: 'top center',
        }}
      >
        {/* Top-Left Vitals */}
        <div className="bg-[#0b0a0d]/85 pixel-border px-3.5 py-2.5 min-w-[200px]">
          <div className="flex items-center justify-between text-xs mb-1 tabular-nums">
            <span className="text-[#c9bcaa] font-bold">{t.hp}</span>
            <span className="text-[#f2e8dc]">
              {hud.hp} / {hud.maxHp}
            </span>
          </div>
          <div className="w-full h-3 bg-[#1a1417] border border-[#2b2427] mb-2">
            <div
              className="h-full bg-[#b82832] transition-all duration-100"
              style={{ width: `${hpPct}%` }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <div className="flex justify-between text-[11px] text-[#8d9ba8] mb-0.5 tabular-nums">
                <span>{t.dash}</span>
                <span>{hud.stamina}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#161920]">
                <div
                  className="h-full bg-[#5cb8e6] transition-all duration-75"
                  style={{ width: `${stamPct}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-[#c79d54] mb-0.5 tabular-nums">
                <span>{t.lamp}</span>
                <span>{lampPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-[#1c1812]">
                <div
                  className="h-full bg-[#e69e35] transition-all duration-150"
                  style={{ width: `${lampPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top-Center: Boss HP Bar (on Boss Floors) or Toast */}
        <div className="flex flex-col items-center gap-2 max-w-md w-full">
          {hud.isBossFloor && hud.bossInfo && (
            <div className="bg-[#120b0d]/92 pixel-border-lit px-4 py-2 w-full">
              <div className="flex items-center justify-between text-xs mb-1 tabular-nums">
                <span className="font-pixel-title text-[#ff6b47]">
                  {hud.bossInfo.name}
                </span>
                <span className="text-[#f2e8dc]">
                  {hud.bossInfo.hp} / {hud.bossInfo.maxHp}
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#1f1215] border border-[#3d1c22]">
                <div
                  className={`h-full transition-all duration-100 ${
                    hud.bossInfo.staggered ? 'bg-[#ffe066]' : 'bg-[#d93636]'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (hud.bossInfo.hp / Math.max(1, hud.bossInfo.maxHp)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {hud.toast && (
            <div
              className="bg-[#0e0d10]/95 pixel-border-lit px-5 py-2.5 text-center transition-opacity duration-150"
              style={{ opacity: Math.min(1, hud.toast.timer * 1.5) }}
            >
              <div
                className="font-pixel-title text-xs md:text-sm tracking-wide"
                style={{ color: hud.toast.color }}
              >
                {hud.toast.title}
              </div>
              <div className="text-xs md:text-sm text-[#d6cec0] mt-1">
                {hud.toast.subtitle}
              </div>
            </div>
          )}
        </div>

        {/* Top-Right Floor & Optional FPS Counter */}
        <div className="bg-[#0b0a0d]/85 pixel-border px-3.5 py-2.5 text-right tabular-nums shrink-0">
          <div className="flex items-center justify-end gap-2">
            {settings.showFps && (
              <span className="text-xs font-bold text-[#8ef59f]">{measuredFps} FPS</span>
            )}
            <span className="font-pixel-title text-xs md:text-sm text-[#f0c06e]">
              {t.floor} {hud.floor}
            </span>
          </div>
          <div className="text-xs text-[#a89f91] mt-1">
            {hud.isBossFloor ? t.bossBadge : hud.currentRoomName}
          </div>
          <div className="flex items-center justify-end gap-2.5 text-xs mt-1.5">
            <span className={hud.hatchUnlocked ? 'text-[#ffaa33] font-bold' : 'text-[#d94848]'}>
              {hud.hatchUnlocked ? t.hatchOpen : t.enemiesCount(hud.enemiesAlive, hud.enemiesTotal)}
            </span>
            <span aria-hidden="true" className="text-[#554e46]">·</span>
            <span className="text-[#d6cec0]">{formatTime(hud.timeSurvived)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Area */}
      <div
        className="flex flex-col items-center justify-end gap-3"
        style={{
          transform: settings.uiScale !== 1 ? `scale(${settings.uiScale})` : undefined,
          transformOrigin: 'bottom center',
        }}
      >
        {hud.interactPrompt && (
          <div className="bg-[#121014]/95 pixel-border-lit px-4 py-2 text-center">
            <div className="flex items-center justify-center gap-2 text-sm md:text-base font-bold text-[#ffe5a3]">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-[#2e2416] border border-[#d69c3e] text-[#7ce38b] text-xs">
                {hud.interactPrompt.button}
              </span>
              <span>{hud.interactPrompt.label}</span>
            </div>
            {hud.interactPrompt.sublabel && (
              <div className="text-xs text-[#bfb5a4] mt-0.5">
                {hud.interactPrompt.sublabel}
              </div>
            )}
          </div>
        )}

        <div className="w-full flex items-end justify-between gap-4">
          {/* Bottom-Left: Equipped R2/RT (Primary) & R1/RB (Secondary) */}
          <div className="flex items-center gap-2">
            <div className="bg-[#0b0a0d]/88 pixel-border px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs font-bold text-[#f0c06e]">{glyphs.r2}</span>
              <span className="text-sm font-bold" style={{ color: r2Def.color }}>
                {r2Def.symbol}
              </span>
              <span className="text-xs text-[#e8dfd1]">{t.skills[hud.slotR2].name}</span>
              {hud.r2Cooldown > 0.05 && (
                <span className="text-[11px] text-[#8f877b] tabular-nums">
                  {hud.r2Cooldown.toFixed(1)}s
                </span>
              )}
            </div>

            {r1Def && hud.slotR1 && (
              <div className="bg-[#0b0a0d]/88 pixel-border px-3 py-1.5 flex items-center gap-2">
                <span className="text-xs font-bold text-[#6ce2ff]">{glyphs.r1}</span>
                <span className="text-sm font-bold" style={{ color: r1Def.color }}>
                  {r1Def.symbol}
                </span>
                <span className="text-xs text-[#e8dfd1]">{t.skills[hud.slotR1].name}</span>
                {hud.r1Cooldown > 0.05 && (
                  <span className="text-[11px] text-[#8f877b] tabular-nums">
                    {hud.r1Cooldown.toFixed(1)}s
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bottom-Right: Controls Guide ONLY on Floor 1! */}
          {hud.floor === 1 && (
            <div className="hidden sm:flex items-center gap-2.5 bg-[#0b0a0d]/82 pixel-border px-3 py-1.5 text-xs text-[#9c9487] whitespace-nowrap">
              <span><strong className="text-[#f0c06e]">{glyphs.r2}/{glyphs.square}</strong> {t.hudAttackR2}</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-[#6ce2ff]">{glyphs.r1}/Q</strong> {t.hudAttackR1}</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-[#9bf5ff]">{glyphs.l1}</strong> {t.hudParry}</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-[#78b8ff]">{glyphs.confirm}</strong> {t.hudDash}</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-[#7ce38b]">{glyphs.interact}</strong> {t.hudLoot}</span>
              <span aria-hidden="true">·</span>
              <span><strong className="text-[#c9bcaa]">{glyphs.bag}/Tab</strong> {t.hudInv}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
