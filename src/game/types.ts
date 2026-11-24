export type GameScreenState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export interface Vec2 {
  x: number;
  y: number;
}

export type TileType = 0 | 1 | 2 | 3 | 4; // 0: wall, 1: floor, 2: storage wood/grate, 3: puddle, 4: machinery/boiler obstacle

export type RoomKind = 'MAIN' | 'ALCOVE' | 'STORAGE' | 'EXIT';

export interface RoomDef {
  id: string;
  kind: RoomKind;
  name: string;
  alcoveIndex?: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WallSparkLamp {
  x: number;
  y: number;
  phase: number;
  dead: boolean;
}

export interface CrateEntity {
  id: string;
  x: number;
  y: number;
  hp: number;
  kind: 'crate' | 'barrel' | 'locker';
  broken: boolean;
  hasLoot: boolean;
}

export type SkillCategory = 'PRIMARY' | 'SECONDARY';

export type SkillId =
  | 'chain_cleave'
  | 'heavy_breaker'
  | 'twin_fangs'
  | 'whirlwind_rend'
  | 'phantom_thrust'
  | 'spark_nova_slash';

export interface SkillDef {
  id: SkillId;
  category: SkillCategory;
  cooldown: number;
  staminaCost: number;
  color: string;
  symbol: string;
}

export type LootKind = 'MEDKIT' | 'OIL' | 'ARTIFACT' | 'SKILL_BOOK';

export interface LootDrop {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: LootKind;
  artifactId?: ArtifactId;
  skillId?: SkillId;
  bobPhase: number;
}

export type ArtifactId =
  | 'blood_fang'
  | 'spark_coil'
  | 'rust_flywheel'
  | 'tungsten_shard'
  | 'kerosene_heart'
  | 'adrenaline_syringe'
  | 'bone_plate'
  | 'serrated_edge'
  | 'vampiric_heart'
  | 'rust_spring'
  | 'glass_edge'
  | 'oil_wick'
  | 'static_boots'
  | 'iron_knuckle';

export interface ArtifactDef {
  id: ArtifactId;
  name: string;
  shortDesc: string;
  color: string;
  symbol: string;
}

export interface DerivedStats {
  maxHp: number;
  lifestealPct: number;
  parryNovaDmg: number;
  attackSpeedMult: number;
  dashDistMult: number;
  damageMult: number;
  riposteMult: number;
  lampRadiusMult: number;
  lampConeDmgBonus: number;
  killDashReset: boolean;
  damageReduction: number;
  incomingDamageMult: number;
  bleedPct: number;
  cooldownReduction: number;
  dashShockDmg: number;
  staggerDurationBonus: number;
  lowHpDamageBonus: number;
  lowHpLifestealBonus: number;
}

export type EnemyKind = 'stalker' | 'brute' | 'duelist' | 'warden' | 'boss';

export type EnemyAIState =
  | 'PATROL'
  | 'CHASE'
  | 'CIRCLE'
  | 'WINDUP'
  | 'ATTACK'
  | 'RECOVER'
  | 'STAGGERED'
  | 'EVADE';

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  name: string;
  isBoss?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  angle: number;
  state: EnemyAIState;
  stateTimer: number;
  attackCooldown: number;
  evadeCooldown: number;
  strafeDir: number;
  comboCount: number;
  hitFlash: number;
  bleedTimer: number;
  bleedDps: number;
  walkPhase: number;
  alerted: boolean;
  parriedWindow: boolean;
  hasDealtDamageThisSwing: boolean;
  homeRoomId: string;
}

export interface PlayerEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  aimAngle: number;
  walkPhase: number;
  attackTimer: number;
  r1Cooldown: number;
  r2Cooldown: number;
  attackCombo: number;
  attackAngle: number;
  swingDir: number;
  activeSkillAnim: SkillId | null;
  // Unlocked skills & 2 equipped slots: Primary on R2, Secondary on R1!
  unlockedSkills: SkillId[];
  slotR2: SkillId; // Primary attack (R2)
  slotR1: SkillId | null; // Secondary attack (R1)
  // Parry
  parryTimer: number;
  parryCooldown: number;
  parrySuccessFlash: number;
  // Dash
  dashTimer: number;
  dashCooldown: number;
  dashDirX: number;
  dashDirY: number;
  invulnTimer: number;
  hitFlash: number;
  lampFuel: number;
  lampFlicker: number;
  adrenalineTimer: number;
  artifacts: Record<ArtifactId, number>;
}

export interface SlashArc {
  x: number;
  y: number;
  angle: number;
  arcWidth: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
  isEnemy: boolean;
  isParryShock?: boolean;
  isFullCircle?: boolean;
}

export interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface SpeedLine {
  x: number;
  y: number;
  angle: number;
  len: number;
  spd: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface ProjectileSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dmg: number;
  color: string;
  life: number;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  lightRadius: number;
  lightColor: string;
  bounce?: boolean;
}

export interface Decal {
  x: number;
  y: number;
  radius: number;
  color: string;
  kind: 'blood' | 'scorch' | 'splinter';
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface AfterImage {
  x: number;
  y: number;
  angle: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloorPalette {
  id: number;
  wallVoid: string;
  wallFace: string;
  wallBrick: string;
  wallTop: string;
  floorA: string;
  floorB: string;
  floorC: string;
  seam: string;
  puddle: string;
  puddleLight: string;
  machinery: string;
  machineryTrim: string;
}

export interface FloorMap {
  width: number;
  height: number;
  tileSize: number;
  tiles: TileType[][];
  rooms: RoomDef[];
  spawn: Vec2;
  hatch: Vec2;
  hatchUnlocked: boolean;
  wallLamps: WallSparkLamp[];
  palette: FloorPalette;
  archTier: number;
}

export interface InteractPrompt {
  label: string;
  sublabel?: string;
  button: '△' | 'Y';
}

export type GraphicsQuality = 'high' | 'medium' | 'low';
export type ColorFilterMode = 'default' | 'cold' | 'rust' | 'toxic';
export type TargetFpsOption = 0 | 30 | 60 | 120 | 144 | 244;
export type DifficultyMode = 'normal' | 'hard' | 'nightmare';
export type ControllerType = 'ps' | 'xbox';

export interface GameSettings {
  quality: GraphicsQuality;
  fpsLimit: TargetFpsOption;
  uiScale: number; // 0.85 | 1 | 1.15
  uiOpacity: number; // 0.65 | 0.85 | 1.0
  shakeScale: number; // 0 | 0.5 | 1
  hitStopEnabled: boolean;
  showFps: boolean;
  difficulty: DifficultyMode;
  controllerType: ControllerType;
}

export interface DeepSettings {
  stretchX: number;
  fullbright: boolean;
  colorMode: ColorFilterMode;
  noTextures: boolean;
  callsign: string;
}

export interface HUDState {
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  lampFuel: number;
  floor: number;
  isBossFloor: boolean;
  bossInfo: { name: string; hp: number; maxHp: number; staggered: boolean } | null;
  enemiesAlive: number;
  enemiesTotal: number;
  hatchUnlocked: boolean;
  kills: number;
  parries: number;
  timeSurvived: number;
  inCombat: boolean;
  unlockedSkills: SkillId[];
  slotR2: SkillId;
  slotR1: SkillId | null;
  r1Cooldown: number;
  r2Cooldown: number;
  stats: DerivedStats;
  artifacts: Array<{ def: ArtifactDef; count: number }>;
  interactPrompt: InteractPrompt | null;
  toast: { title: string; subtitle: string; color: string; timer: number } | null;
  currentRoomName: string;
  gamepadConnected: boolean;
  gamepadName: string;
  bestFloor: number;
  bestTime: number;
}

export interface InputSnapshot {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  hasAimInput: boolean;
  attackR1Pressed: boolean;
  attackR2Pressed: boolean;
  parryPressed: boolean;
  dashPressed: boolean;
  interactPressed: boolean;
  inventoryPressed: boolean;
  pausePressed: boolean;
  menuUp: boolean;
  menuDown: boolean;
  menuLeft: boolean;
  menuRight: boolean;
  menuConfirm: boolean;
  menuBack: boolean;
  menuSquare: boolean;
  menuR1: boolean;
  menuL1: boolean;
  menuR2: boolean;
  gamepadConnected: boolean;
  gamepadName: string;
}
