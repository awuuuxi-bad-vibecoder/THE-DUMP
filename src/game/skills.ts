import { SkillDef, SkillId } from './types';

export const SKILLS: Record<SkillId, SkillDef> = {
  // =========================================================================
  // PRIMARY ATTACKS (R2)
  // =========================================================================
  chain_cleave: {
    id: 'chain_cleave',
    category: 'PRIMARY',
    cooldown: 0.22,
    staminaCost: 0,
    color: '#ffdf9e',
    symbol: '⚔',
  },
  heavy_breaker: {
    id: 'heavy_breaker',
    category: 'PRIMARY',
    cooldown: 0.42,
    staminaCost: 0,
    color: '#ff7b3b',
    symbol: '⚒',
  },
  twin_fangs: {
    id: 'twin_fangs',
    category: 'PRIMARY',
    cooldown: 0.16,
    staminaCost: 0,
    color: '#ff4f79',
    symbol: '✕',
  },

  // =========================================================================
  // SECONDARY SKILLS (R1)
  // =========================================================================
  whirlwind_rend: {
    id: 'whirlwind_rend',
    category: 'SECONDARY',
    cooldown: 1.55,
    staminaCost: 18,
    color: '#ff9633',
    symbol: '◎',
  },
  phantom_thrust: {
    id: 'phantom_thrust',
    category: 'SECONDARY',
    cooldown: 1.7,
    staminaCost: 20,
    color: '#6ce2ff',
    symbol: '➳',
  },
  spark_nova_slash: {
    id: 'spark_nova_slash',
    category: 'SECONDARY',
    cooldown: 1.4,
    staminaCost: 16,
    color: '#ffe05c',
    symbol: '✸',
  },
};

export const ALL_SKILL_IDS: SkillId[] = [
  'chain_cleave',
  'heavy_breaker',
  'twin_fangs',
  'whirlwind_rend',
  'phantom_thrust',
  'spark_nova_slash',
];

export const PRIMARY_SKILL_IDS: SkillId[] = ['chain_cleave', 'heavy_breaker', 'twin_fangs'];
export const SECONDARY_SKILL_IDS: SkillId[] = ['whirlwind_rend', 'phantom_thrust', 'spark_nova_slash'];
