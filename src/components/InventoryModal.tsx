import React, { useEffect, useRef } from 'react';
import { getGlyphs, I18N, Lang } from '../game/i18n';
import { ALL_SKILL_IDS, SKILLS } from '../game/skills';
import { ControllerType, HUDState, SkillId } from '../game/types';

export type InventoryTab = 'CHAR' | 'SKILLS' | 'ARTIFACTS';

interface InventoryModalProps {
  hud: HUDState;
  lang: Lang;
  controllerType: ControllerType;
  callsign: string;
  activeTab: InventoryTab;
  focusedSkillIdx: number;
  focusedArtifactIdx: number;
  onChangeTab: (tab: InventoryTab) => void;
  onFocusSkill: (idx: number) => void;
  onFocusArtifact: (idx: number) => void;
  onAssignSkill: (slot: 'R1' | 'R2', skillId: SkillId) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  hud,
  lang,
  controllerType,
  callsign,
  activeTab,
  focusedSkillIdx,
  focusedArtifactIdx,
  onChangeTab,
  onFocusSkill,
  onFocusArtifact,
  onAssignSkill,
  onClose,
}) => {
  const t = I18N[lang];
  const glyphs = getGlyphs(controllerType);
  const clampedArtIdx = Math.min(focusedArtifactIdx, Math.max(0, hud.artifacts.length - 1));
  const selectedArtifact = hud.artifacts[clampedArtIdx] ?? hud.artifacts[0] ?? null;
  const charName = callsign.trim() || 'seq';

  const skillRefs = useRef<(HTMLDivElement | null)[]>([]);
  const artifactRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Smooth auto-scroll to focused item when navigating via gamepad or keyboard
  useEffect(() => {
    if (activeTab === 'SKILLS') {
      skillRefs.current[focusedSkillIdx]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [activeTab, focusedSkillIdx]);

  useEffect(() => {
    if (activeTab === 'ARTIFACTS' && hud.artifacts.length > 0) {
      artifactRefs.current[clampedArtIdx]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [activeTab, clampedArtIdx, hud.artifacts.length]);

  return (
    <div className="absolute inset-0 z-30 bg-[#050507]/88 flex items-center justify-center p-3 md:p-6">
      <div className="bg-[#0f0e12] pixel-border-lit w-full max-w-2xl p-4 md:p-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#26232b] pb-3 mb-3 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-pixel-title text-base md:text-lg text-[#f0c06e]">
              {t.invTitle}
            </h2>
            <span className="text-xs text-[#8f877b]">
              {charName} · {t.floor} {hud.floor}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-[#1b1920] text-[#d6cec0] hover:text-white pixel-border text-xs cursor-pointer whitespace-nowrap"
          >
            {glyphs.back} / Tab · {t.close}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-4 shrink-0">
          {(
            [
              { id: 'CHAR', label: charName },
              { id: 'SKILLS', label: t.invTabSkills },
              { id: 'ARTIFACTS', label: `${t.invTabArtifacts} (${hud.artifacts.length})` },
            ] as Array<{ id: InventoryTab; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`px-4 py-2 text-xs md:text-sm font-bold cursor-pointer whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-[#2a2115] text-[#fff2d1] pixel-border-lit'
                  : 'bg-[#16151a] text-[#7c7469] pixel-border hover:text-[#cfc7b8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="overflow-y-auto pr-1 flex-1 scroll-smooth">
          {activeTab === 'CHAR' && (
            <div className="space-y-4">
              <div className="bg-[#151419] pixel-border p-3.5 text-sm text-[#cfc7b8]">
                <span className="text-[#ffb84d] font-bold mr-2">{charName}:</span>
                {t.invCharLore.replace('seq', charName)}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                <div className="bg-[#141318] pixel-border p-3">
                  <div className="text-[#7c7469]">{t.hp}</div>
                  <div className="text-base font-bold text-[#e8dfd1] mt-1">
                    {hud.hp} / {hud.maxHp}
                  </div>
                </div>
                <div className="bg-[#141318] pixel-border p-3">
                  <div className="text-[#7c7469]">{t.invStatsDamage}</div>
                  <div className="text-base font-bold text-[#f0c06e] mt-1">
                    {Math.round(hud.stats.damageMult * 100)}%
                  </div>
                </div>
                <div className="bg-[#141318] pixel-border p-3">
                  <div className="text-[#7c7469]">{t.invStatsAtkSpeed}</div>
                  <div className="text-base font-bold text-[#f0c06e] mt-1">
                    {Math.round(hud.stats.attackSpeedMult * 100)}%
                  </div>
                </div>
                <div className="bg-[#141318] pixel-border p-3">
                  <div className="text-[#7c7469]">{t.invStatsLifesteal}</div>
                  <div className="text-base font-bold text-[#63e678] mt-1">
                    +{Math.round(hud.stats.lifestealPct * 100)}%
                  </div>
                </div>
                <div className="bg-[#141318] pixel-border p-3">
                  <div className="text-[#7c7469]">{t.invStatsRiposte}</div>
                  <div className="text-base font-bold text-[#9bf5ff] mt-1">
                    {hud.stats.riposteMult.toFixed(1)}x
                  </div>
                </div>
                <div className="bg-[#141318] pixel-border p-3">
                  <div className="text-[#7c7469]">{t.invStatsDefense}</div>
                  <div className="text-base font-bold text-[#d6ccb8] mt-1">
                    -{Math.round(hud.stats.damageReduction * 100)}%
                  </div>
                </div>
                <div className="bg-[#141318] pixel-border p-3">
                  <div className="text-[#7c7469]">{t.invStatsBleed}</div>
                  <div className="text-base font-bold text-[#e0485e] mt-1">
                    +{Math.round(hud.stats.bleedPct * 100)}%
                  </div>
                </div>
                <div className="bg-[#141318] pixel-border p-3">
                  <div className="text-[#7c7469]">{t.invStatsCooldown}</div>
                  <div className="text-base font-bold text-[#ffb84d] mt-1">
                    -{Math.round(hud.stats.cooldownReduction * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SKILLS' && (
            <div className="space-y-2.5">
              {ALL_SKILL_IDS.map((id, idx) => {
                const unlocked = hud.unlockedSkills.includes(id);
                const def = SKILLS[id];
                const skText = t.skills[id];
                const isR2 = hud.slotR2 === id;
                const isR1 = hud.slotR1 === id;
                const isFocused = idx === focusedSkillIdx;
                const isPrimary = def.category === 'PRIMARY';

                return (
                  <div
                    key={id}
                    ref={(el) => {
                      skillRefs.current[idx] = el;
                    }}
                    onMouseEnter={() => onFocusSkill(idx)}
                    onClick={() => {
                      onFocusSkill(idx);
                      if (unlocked) onAssignSkill(isPrimary ? 'R2' : 'R1', id);
                    }}
                    className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isFocused
                        ? 'bg-[#211c16] pixel-border-lit'
                        : unlocked
                          ? 'bg-[#151419] pixel-border'
                          : 'bg-[#0c0b0e] pixel-border opacity-55'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm md:text-base font-bold" style={{ color: def.color }}>
                          {isFocused ? '▸ ' : ''}
                          {def.symbol} {skText.name}
                        </span>
                        <span className="text-[11px] text-[#8f877b]">
                          ({isPrimary ? t.skillCategoryPrimary : t.skillCategorySecondary})
                        </span>
                        {isR2 && (
                          <span className="text-xs font-bold text-[#f0c06e]">
                            [{glyphs.r2} · {t.invSkillEquippedR2}]
                          </span>
                        )}
                        {isR1 && (
                          <span className="text-xs font-bold text-[#6ce2ff]">
                            [{glyphs.r1} · {t.invSkillEquippedR1}]
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9c9487] mt-1">
                        {unlocked ? skText.fullDesc : t.invSkillLocked}
                      </p>
                    </div>

                    {unlocked && (
                      <div className="shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignSkill(isPrimary ? 'R2' : 'R1', id);
                          }}
                          className={`px-3 py-1.5 text-xs font-bold cursor-pointer whitespace-nowrap ${
                            isR2 || isR1
                              ? 'bg-[#2e2416] text-[#ffd584] pixel-border-lit'
                              : 'bg-[#1c1b22] text-[#b5ada0] pixel-border hover:text-white'
                          }`}
                        >
                          {isPrimary ? `${glyphs.r2} ${t.invSkillAssignR2}` : `${glyphs.r1} ${t.invSkillAssignR1}`}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'ARTIFACTS' && (
            <div>
              {hud.artifacts.length === 0 ? (
                <div className="bg-[#141318] pixel-border p-6 text-center text-sm text-[#8a8277]">
                  {t.invNoArtifacts}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                    {hud.artifacts.map(({ def, count }, idx) => {
                      const isFocused = idx === clampedArtIdx;
                      return (
                        <button
                          key={def.id}
                          ref={(el) => {
                            artifactRefs.current[idx] = el;
                          }}
                          onMouseEnter={() => onFocusArtifact(idx)}
                          onClick={() => onFocusArtifact(idx)}
                          className={`p-3 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                            isFocused
                              ? 'bg-[#2a2115] pixel-border-lit scale-105'
                              : 'bg-[#141318] pixel-border hover:bg-[#1b1a20]'
                          }`}
                        >
                          <span className="text-xl font-bold" style={{ color: def.color }}>
                            {def.symbol}
                          </span>
                          <span className="text-[11px] text-[#cfc7b8] tabular-nums">
                            ×{count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedArtifact && (
                    <div className="bg-[#151419] pixel-border p-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm md:text-base" style={{ color: selectedArtifact.def.color }}>
                          {selectedArtifact.def.symbol} {selectedArtifact.def.name}
                        </span>
                        <span className="text-xs text-[#9c9487] tabular-nums">
                          ×{selectedArtifact.count}
                        </span>
                      </div>
                      <p className="text-sm text-[#d6cec0]">
                        {selectedArtifact.def.shortDesc}
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-[#787066] text-center">
                    {t.invInspectHint}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic PS / Xbox Gamepad Legend */}
        <div className="mt-3 pt-2.5 border-t border-[#26232b] text-[11px] text-[#8f877b] text-center shrink-0">
          {t.invGamepadLegend(glyphs)}
        </div>
      </div>
    </div>
  );
};
