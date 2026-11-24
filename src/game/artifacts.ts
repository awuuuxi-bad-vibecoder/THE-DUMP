import { ArtifactDef, ArtifactId, DerivedStats } from './types';

export const ARTIFACTS: Record<ArtifactId, ArtifactDef> = {
  blood_fang: {
    id: 'blood_fang',
    name: 'Blood Fang',
    shortDesc: 'Heal +10% of damage dealt',
    color: '#d93838',
    symbol: '♥',
  },
  spark_coil: {
    id: 'spark_coil',
    name: 'Spark Coil',
    shortDesc: 'Parry emits a 45 dmg shockwave',
    color: '#5cc8ff',
    symbol: '⚡',
  },
  rust_flywheel: {
    id: 'rust_flywheel',
    name: 'Rust Flywheel',
    shortDesc: 'Attack speed +20%, dash distance +15%',
    color: '#e59a3c',
    symbol: '⚙',
  },
  tungsten_shard: {
    id: 'tungsten_shard',
    name: 'Tungsten Shard',
    shortDesc: '+15% damage, +60% parry riposte crit',
    color: '#f2d06b',
    symbol: '◆',
  },
  kerosene_heart: {
    id: 'kerosene_heart',
    name: 'Kerosene Heart',
    shortDesc: '+35% lamp radius, +15% close-range damage',
    color: '#ff9d2e',
    symbol: '☀',
  },
  adrenaline_syringe: {
    id: 'adrenaline_syringe',
    name: 'Adrenaline Shot',
    shortDesc: 'Kills reset dash cooldown and boost speed',
    color: '#57d163',
    symbol: '✚',
  },
  bone_plate: {
    id: 'bone_plate',
    name: 'Bone Plate',
    shortDesc: '-18% incoming damage, +15 max HP',
    color: '#d6ccb8',
    symbol: '⛨',
  },
  serrated_edge: {
    id: 'serrated_edge',
    name: 'Serrated Edge',
    shortDesc: 'Strikes inflict +25% bleed damage',
    color: '#c42b47',
    symbol: '⚔',
  },
  vampiric_heart: {
    id: 'vampiric_heart',
    name: 'Vampiric Heart',
    shortDesc: 'Below 45% HP: +20% damage & +8% lifesteal',
    color: '#b8255f',
    symbol: '❦',
  },
  rust_spring: {
    id: 'rust_spring',
    name: 'Rust Spring',
    shortDesc: '-16% skill cooldowns & +10% attack speed',
    color: '#cc864b',
    symbol: '➰',
  },
  glass_edge: {
    id: 'glass_edge',
    name: 'Glass Edge',
    shortDesc: '+30% damage dealt, +15% damage taken',
    color: '#9ee8ff',
    symbol: '❖',
  },
  oil_wick: {
    id: 'oil_wick',
    name: 'Oil Wick',
    shortDesc: '+25% lamp radius & better loot drops',
    color: '#f5b841',
    symbol: '🜂',
  },
  static_boots: {
    id: 'static_boots',
    name: 'Static Boots',
    shortDesc: 'Dashing shocks nearby foes for 22 dmg',
    color: '#66d9ff',
    symbol: '↯',
  },
  iron_knuckle: {
    id: 'iron_knuckle',
    name: 'Iron Knuckle',
    shortDesc: '+35% enemy stagger duration & heavy impact',
    color: '#a8b2bd',
    symbol: '☗',
  },
};

export const ARTIFACT_IDS = Object.keys(ARTIFACTS) as ArtifactId[];

export function createEmptyArtifacts(): Record<ArtifactId, number> {
  return {
    blood_fang: 0,
    spark_coil: 0,
    rust_flywheel: 0,
    tungsten_shard: 0,
    kerosene_heart: 0,
    adrenaline_syringe: 0,
    bone_plate: 0,
    serrated_edge: 0,
    vampiric_heart: 0,
    rust_spring: 0,
    glass_edge: 0,
    oil_wick: 0,
    static_boots: 0,
    iron_knuckle: 0,
  };
}

export function computeDerivedStats(artifacts: Record<ArtifactId, number>): DerivedStats {
  const bloodFang = artifacts.blood_fang || 0;
  const sparkCoil = artifacts.spark_coil || 0;
  const flywheel = artifacts.rust_flywheel || 0;
  const tungsten = artifacts.tungsten_shard || 0;
  const kerosene = artifacts.kerosene_heart || 0;
  const adrenaline = artifacts.adrenaline_syringe || 0;
  const bonePlate = artifacts.bone_plate || 0;
  const serrated = artifacts.serrated_edge || 0;
  const vampiric = artifacts.vampiric_heart || 0;
  const rustSpring = artifacts.rust_spring || 0;
  const glassEdge = artifacts.glass_edge || 0;
  const oilWick = artifacts.oil_wick || 0;
  const staticBoots = artifacts.static_boots || 0;
  const ironKnuckle = artifacts.iron_knuckle || 0;

  return {
    maxHp: 120 + bonePlate * 15,
    lifestealPct: bloodFang * 0.1,
    parryNovaDmg: sparkCoil * 45,
    attackSpeedMult: 1 + flywheel * 0.2 + rustSpring * 0.1,
    dashDistMult: 1 + flywheel * 0.15,
    damageMult: 1 + tungsten * 0.15 + glassEdge * 0.3,
    riposteMult: 2.2 + tungsten * 0.6,
    lampRadiusMult: 1 + kerosene * 0.35 + oilWick * 0.25,
    lampConeDmgBonus: kerosene * 0.15,
    killDashReset: adrenaline > 0,
    damageReduction: Math.min(0.6, 1 - Math.pow(0.82, bonePlate)),
    incomingDamageMult: Math.pow(1.15, glassEdge),
    bleedPct: serrated * 0.25,
    cooldownReduction: Math.min(0.55, 1 - Math.pow(0.84, rustSpring)),
    dashShockDmg: staticBoots * 22,
    staggerDurationBonus: ironKnuckle * 0.35,
    lowHpDamageBonus: vampiric * 0.2,
    lowHpLifestealBonus: vampiric * 0.08,
  };
}

export function pickRandomArtifact(owned: Record<ArtifactId, number>): ArtifactId {
  const unowned = ARTIFACT_IDS.filter((id) => (owned[id] || 0) === 0);
  if (unowned.length > 0) {
    return unowned[Math.floor(Math.random() * unowned.length)];
  }
  return ARTIFACT_IDS[Math.floor(Math.random() * ARTIFACT_IDS.length)];
}
