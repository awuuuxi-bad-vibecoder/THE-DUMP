import {
  ArtifactId,
  ColorFilterMode,
  ControllerType,
  DifficultyMode,
  EnemyKind,
  GraphicsQuality,
  RoomKind,
  SkillId,
} from './types';

export type Lang = 'en' | 'ru';

const STORAGE_LANG_KEY = 'the_dump_lang_v1';

export function loadSavedLang(): Lang {
  try {
    const val = localStorage.getItem(STORAGE_LANG_KEY);
    if (val === 'ru' || val === 'en') return val;
  } catch {
    // ignore
  }
  return 'en';
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export interface ControllerGlyphs {
  confirm: string;
  back: string;
  square: string;
  interact: '△' | 'Y';
  r2: string;
  r1: string;
  l1: string;
  bag: string;
  moveStick: string;
  aimStick: string;
}

export function getGlyphs(controller: ControllerType): ControllerGlyphs {
  if (controller === 'xbox') {
    return {
      confirm: 'A',
      back: 'B',
      square: 'X',
      interact: 'Y',
      r2: 'RT',
      r1: 'RB',
      l1: 'LB / B',
      bag: 'View',
      moveStick: 'LS',
      aimStick: 'RS',
    };
  }
  return {
    confirm: '✕',
    back: '◯',
    square: '▢',
    interact: '△',
    r2: 'R2',
    r1: 'R1',
    l1: 'L1 / ◯',
    bag: 'Touchpad',
    moveStick: 'Left Stick',
    aimStick: 'Right Stick',
  };
}

export interface TranslationDict {
  gameTitle: string;
  tagline: string;
  enterCellar: string;
  autoBench: string;
  settings: string;
  resume: string;
  restart: string;
  mainMenu: string;
  retry: string;
  paused: string;
  gameOver: string;
  lightWentOut: string;
  settingsTitle: string;
  languageLabel: string;
  languageValue: string;
  difficultyLabel: string;
  difficultyValues: Record<DifficultyMode, string>;
  controllerLabel: string;
  controllerValues: Record<ControllerType, string>;
  fullscreenLabel: string;
  soundLabel: string;
  musicLabel: string;
  graphicsLabel: string;
  graphicsValues: Record<GraphicsQuality, string>;
  fpsLimitLabel: string;
  fpsUnlimited: string;
  uiScaleLabel: string;
  uiOpacityLabel: string;
  shakeLabel: string;
  hitStopLabel: string;
  showFpsLabel: string;
  deepSettingsLabel: string;
  deepSettingsTitle: string;
  deepWipNote: string;
  trailerLabel: string;
  trailerTitle: string;
  trailerHint: string;
  trailerScenes: string[];
  replayIntroLabel: string;
  stretchLabel: string;
  fullbrightLabel: string;
  colorModeLabel: string;
  colorModeValues: Record<ColorFilterMode, string>;
  noTexturesLabel: string;
  callsignLabel: string;
  controlsLabel: string;
  welcomeTitle: string;
  welcomeSubtitle: string;
  welcomeStartBtn: string;
  welcomeStepOf: (step: number, total: number) => string;
  welcomeNext: string;
  welcomePrev: string;
  welcomeSkip: string;
  welcomeSteps: {
    langTitle: string;
    langDesc: string;
    padTitle: string;
    padDesc: string;
    diffTitle: string;
    diffDesc: string;
    diffBars: Record<DifficultyMode, { hp: number; speed: number; dmg: number; note: string }>;
    gfxTitle: string;
    gfxDesc: string;
    gfxNotes: Record<GraphicsQuality, string>;
    guideTitle: string;
    guideDesc: string;
    guideParryTitle: string;
    guideParryDesc: string;
    guideAimTitle: string;
    guideAimDesc: string;
    guideLootTitle: string;
    guideLootDesc: string;
    readyTitle: string;
    readyDesc: string;
  };
  crashTitle: string;
  crashSubtitle: string;
  crashCopy: string;
  crashCopied: string;
  crashContinue: string;
  crashReset: string;
  on: string;
  off: string;
  yes: string;
  no: string;
  back: string;
  close: string;
  controlsTitle: string;
  ctrlMove: string;
  ctrlMoveDesc: string;
  ctrlAim: string;
  ctrlAimDesc: string;
  ctrlR2Desc: string;
  ctrlR1Desc: string;
  ctrlParryDesc: string;
  ctrlDashDesc: string;
  ctrlLootDesc: string;
  ctrlInvDesc: string;
  ctrlKb: string;
  ctrlKbDesc: string;
  hp: string;
  dash: string;
  lamp: string;
  floor: string;
  hatchOpen: string;
  enemiesCount: (alive: number, total: number) => string;
  bossBadge: string;
  statFloor: string;
  statTime: string;
  statKills: string;
  statParries: string;
  statArtifacts: string;
  hudAttackR2: string;
  hudAttackR1: string;
  hudParry: string;
  hudDash: string;
  hudLoot: string;
  hudInv: string;
  hudPause: string;
  corridor: string;
  parryShout: string;
  toastFloor1Title: string;
  toastFloor1Sub: string;
  toastFloorNTitle: (n: number) => string;
  toastFloorNSub: string;
  toastBossTitle: (n: number) => string;
  toastBossSub: string;
  toastHatchTitle: string;
  toastHatchSub: string;
  toastArtifactPrefix: string;
  toastSkillPrefix: string;
  promptTakeArtifact: (name: string) => string;
  promptTakeSkillBook: (name: string) => string;
  promptUnlockLocker: string;
  promptSearchCrate: string;
  promptDescend: (n: number) => string;
  promptHatchLocked: (n: number) => string;
  floatLamp: string;
  skillBookTitle: string;
  skillBookQuestion: string;
  skillPreviewHint: string;
  skillCategoryPrimary: string;
  skillCategorySecondary: string;
  invTitle: string;
  invTabCharacter: string;
  invTabSkills: string;
  invTabArtifacts: string;
  invCharLore: string;
  invStatsDamage: string;
  invStatsAtkSpeed: string;
  invStatsLifesteal: string;
  invStatsRiposte: string;
  invStatsDefense: string;
  invStatsBleed: string;
  invStatsLamp: string;
  invStatsCooldown: string;
  invSkillAssignR2: string;
  invSkillAssignR1: string;
  invSkillEquippedR2: string;
  invSkillEquippedR1: string;
  invSkillLocked: string;
  invNoArtifacts: string;
  invInspectHint: string;
  invGamepadLegend: (g: ControllerGlyphs) => string;
  benchTitle: string;
  benchDesc: string;
  benchTargetFps: string;
  benchRunBtn: string;
  benchRunning: string;
  benchApplyBtn: string;
  benchResultAvg: string;
  benchResultRecommended: string;
  benchAppliedToast: string;
  menuTips: string[];
  rooms: Record<RoomKind, string[]>;
  enemies: Record<EnemyKind, string>;
  skills: Record<SkillId, { name: string; shortDesc: string; fullDesc: string }>;
  artifacts: Record<ArtifactId, { name: string; desc: string }>;
}

const EN: TranslationDict = {
  gameTitle: 'THE_DUMP',
  tagline: 'Begin. Die. Repeat.',
  enterCellar: 'Enter Cellar',
  autoBench: 'Auto Graphics / Bench',
  settings: 'Settings',
  resume: 'Resume',
  restart: 'Restart',
  mainMenu: 'Main Menu',
  retry: 'Descend Again',
  paused: 'PAUSED',
  gameOver: 'YOU FELL IN THE DARK',
  lightWentOut: 'The lamp went out',
  settingsTitle: 'SETTINGS',
  languageLabel: 'Language',
  languageValue: 'English',
  difficultyLabel: 'Difficulty',
  difficultyValues: { normal: 'Normal', hard: 'Hard', nightmare: 'Nightmare' },
  controllerLabel: 'Gamepad',
  controllerValues: { ps: 'PlayStation', xbox: 'Xbox' },
  fullscreenLabel: 'Fullscreen',
  soundLabel: 'SFX',
  musicLabel: 'Music',
  graphicsLabel: 'Graphics',
  graphicsValues: { high: 'High (270p)', medium: 'Med (216p)', low: 'Low (180p)' },
  fpsLimitLabel: 'FPS Limit',
  fpsUnlimited: 'Unlimited',
  uiScaleLabel: 'UI Scale',
  uiOpacityLabel: 'UI Opacity',
  shakeLabel: 'Screen Shake',
  hitStopLabel: 'Hit-Stop',
  showFpsLabel: 'FPS Counter',
  deepSettingsLabel: 'Random Features',
  deepSettingsTitle: 'RANDOM FEATURES',
  deepWipNote: 'Experimental visual extras, guide & trailer',
  trailerLabel: 'Game Trailer',
  trailerTitle: 'THE_DUMP // OFFICIAL PREVIEW',
  trailerHint: 'D-Pad / Space Replay · Back to Return',
  trailerScenes: [
    'DEEP BELOW THE CONCRETE...',
    'ONLY YOUR LAMP CUTS THE DARK.',
    'PARRY THE CRIMSON GLINT.',
    'SHATTER FOES. STEAL RELICS.',
    'THE OVERLORD AWAITS EVERY 10 FLOORS.',
    'THE_DUMP — BEGIN. DIE. REPEAT.',
  ],
  replayIntroLabel: 'Welcome & Guide',
  stretchLabel: 'Aspect Stretch',
  fullbrightLabel: 'Fullbright',
  colorModeLabel: 'Color Palette',
  colorModeValues: { default: 'Default', cold: 'Cold Steel', rust: 'Blood Rust', toxic: 'Acid Dump' },
  noTexturesLabel: 'No Textures',
  callsignLabel: 'Runner Tag',
  controlsLabel: 'Controls',
  welcomeTitle: 'WELCOME TO THE_DUMP',
  welcomeSubtitle: 'Configure your initial setup before descending. All settings are saved automatically.',
  welcomeStartBtn: 'Confirm & Enter',
  welcomeStepOf: (step, total) => `STEP ${step} / ${total}`,
  welcomeNext: 'Next',
  welcomePrev: 'Back',
  welcomeSkip: 'Skip',
  welcomeSteps: {
    langTitle: '1. SELECT LANGUAGE',
    langDesc: 'Only your brass lamp and steel remain below. Choose your interface language.',
    padTitle: '2. GAMEPAD LAYOUT',
    padDesc: 'THE_DUMP is tuned for twin-stick gamepads. Pick your controller glyphs.',
    diffTitle: '3. DIFFICULTY LEVEL',
    diffDesc: 'Higher tiers scale enemy speed, numbers, damage, and boss aggression.',
    diffBars: {
      normal: { hp: 45, speed: 50, dmg: 45, note: 'Balanced descent for learning parry timings.' },
      hard: { hp: 75, speed: 78, dmg: 75, note: 'Intended brutal pace. Relentless cellar combat.' },
      nightmare: { hp: 100, speed: 100, dmg: 100, note: 'Deadly swarms, fast windups & boss guards.' },
    },
    gfxTitle: '4. VISUAL QUALITY',
    gfxDesc: 'Preview live pixel resolution and dynamic cellar lamp lighting.',
    gfxNotes: {
      high: 'Crisp 480×270 pixel grid + full additive sparks & glows.',
      medium: '384×216 resolution + full additive lighting (great balance).',
      low: '320×180 performance mode, reduced glow pass for maximum FPS.',
    },
    guideTitle: '5. SURVIVAL GUIDE',
    guideDesc: 'Master these three rules to survive the sub-levels.',
    guideParryTitle: 'PARRY CRIMSON GLINTS',
    guideParryDesc: 'When an enemy weapon flashes red, press Parry to stagger them for a massive riposte crit!',
    guideAimTitle: 'TWIN-STICK & SKILLS',
    guideAimDesc: 'Move with Left Stick, aim strikes with Right Stick. Find Skill Books & equip in Inventory.',
    guideLootTitle: 'RELICS & HATCH',
    guideLootDesc: 'Smash crates & lockers for passive Artifacts and lamp oil. Clear all foes to unlock the hatch.',
    readyTitle: '6. READY TO DESCEND',
    readyDesc: 'All settings saved. You can tweak anything later in Settings or run the FPS Benchmark.',
  },
  crashTitle: 'SAFE MODE // CRASH DETECTOR',
  crashSubtitle: 'An unexpected runtime error was caught and logged so you can copy it before resetting.',
  crashCopy: 'Copy Full Log',
  crashCopied: 'Copied!',
  crashContinue: 'Try Resume',
  crashReset: 'Clear & Reload',
  on: 'ON',
  off: 'OFF',
  yes: 'Yes',
  no: 'No',
  back: 'Back',
  close: 'Close',
  controlsTitle: 'GAMEPAD CONTROLS',
  ctrlMove: 'Left Stick',
  ctrlMoveDesc: 'Move',
  ctrlAim: 'Right Stick',
  ctrlAimDesc: 'Aim Strikes',
  ctrlR2Desc: 'Primary Attack',
  ctrlR1Desc: 'Secondary Skill',
  ctrlParryDesc: 'Parry & Stagger',
  ctrlDashDesc: 'Dash (i-frames)',
  ctrlLootDesc: 'Loot / Book / Hatch',
  ctrlInvDesc: 'Open Inventory',
  ctrlKb: 'Keyboard (Backup)',
  ctrlKbDesc: 'WASD · Mouse · LMB/J (Primary) · Q/MMB (Skill) · RMB · Space · E · Tab',
  hp: 'HEALTH',
  dash: 'DASH',
  lamp: 'LAMP',
  floor: 'FLOOR',
  hatchOpen: 'Hatch Open',
  enemiesCount: (alive, total) => `Foes: ${alive}/${total}`,
  bossBadge: 'BOSS FLOOR',
  statFloor: 'Floor',
  statTime: 'Time',
  statKills: 'Kills',
  statParries: 'Parries',
  statArtifacts: 'Artifacts',
  hudAttackR2: 'Primary',
  hudAttackR1: 'Skill',
  hudParry: 'Parry',
  hudDash: 'Dash',
  hudLoot: 'Loot',
  hudInv: 'Bag',
  hudPause: 'Pause',
  corridor: 'Corridor',
  parryShout: 'PARRY!',
  toastFloor1Title: 'FLOOR 1: THE_DUMP',
  toastFloor1Sub: 'Parry crimson glints · Survive the dark',
  toastFloorNTitle: (n) => `FLOOR ${n}`,
  toastFloorNSub: 'Foes grow deadlier and faster',
  toastBossTitle: (n) => `FLOOR ${n}: BOSS ENCOUNTER`,
  toastBossSub: 'Defeat the Dump Overlord to unlock the hatch',
  toastHatchTitle: 'HATCH UNLOCKED',
  toastHatchSub: 'Descend at the exit chamber',
  toastArtifactPrefix: 'ARTIFACT',
  toastSkillPrefix: 'NEW SKILL BOOK',
  promptTakeArtifact: (name) => `TAKE: ${name}`,
  promptTakeSkillBook: (name) => `NEW SKILL BOOK: ${name}`,
  promptUnlockLocker: 'BREAK LOCKER',
  promptSearchCrate: 'SEARCH CRATE',
  promptDescend: (n) => `DESCEND TO FLOOR ${n}`,
  promptHatchLocked: (n) => `HATCH LOCKED (${n} FOES LEFT)`,
  floatLamp: '+OIL',
  skillBookTitle: 'NEW SKILL BOOK',
  skillBookQuestion: 'Do you want to see how this skill works?',
  skillPreviewHint: 'Equip Primary / Secondary in Inventory',
  skillCategoryPrimary: 'PRIMARY',
  skillCategorySecondary: 'SECONDARY',
  invTitle: 'INVENTORY',
  invTabCharacter: 'seq',
  invTabSkills: 'Skills',
  invTabArtifacts: 'Artifacts',
  invCharLore: 'Runner: seq · Caught in the sub-levels with only a brass lamp and steel.',
  invStatsDamage: 'Base Damage',
  invStatsAtkSpeed: 'Attack Speed',
  invStatsLifesteal: 'Vampirism',
  invStatsRiposte: 'Parry Crit',
  invStatsDefense: 'Armor',
  invStatsBleed: 'Bleed',
  invStatsLamp: 'Lamp Radius',
  invStatsCooldown: 'Cooldown Haste',
  invSkillAssignR2: 'Equip Primary',
  invSkillAssignR1: 'Equip Secondary',
  invSkillEquippedR2: 'PRIMARY',
  invSkillEquippedR1: 'SECONDARY',
  invSkillLocked: 'Find New Skill Book in the cellar to unlock',
  invNoArtifacts: 'No artifacts collected yet. Smash crates and lockers.',
  invInspectHint: 'Move cursor over an artifact to inspect passive effects',
  invGamepadLegend: (g) =>
    `${g.l1.split(' ')[0]} / ${g.r1} Tabs · D-Pad Move · ${g.confirm} Equip Primary · ${g.square} Equip Skill · ${g.back} Close`,
  benchTitle: 'AUTO GRAPHICS / BENCHMARK',
  benchDesc: 'Measures real lighting & particle rendering throughput and tunes resolution + frame cap for your target FPS.',
  benchTargetFps: 'Target FPS',
  benchRunBtn: 'Run 3s Stress Benchmark',
  benchRunning: 'Testing cellar load...',
  benchApplyBtn: 'Apply Recommended Settings',
  benchResultAvg: 'Measured Avg FPS',
  benchResultRecommended: 'Auto Preset',
  benchAppliedToast: 'Applied!',
  menuTips: [
    'TIP: Right stick aims strikes independently from Left stick movement.',
    'TIP: Every 10 floors holds a Boss; every 20 floors changes architecture.',
    'TIP: Check Random Features for the Game Trailer and Realistic audio mode.',
    'TIP: Parry crimson enemy glints for massive riposte damage.',
    'TIP: Tune difficulty and Xbox/PS button glyphs in Settings.',
  ],
  rooms: {
    MAIN: ['Main Boiler Hall'],
    ALCOVE: ['Damp Cell', 'Rust Alcove', 'Dark Recess', 'Furnace Nook'],
    STORAGE: ['Supply Storage'],
    EXIT: ['Descent Shaft'],
  },
  enemies: {
    stalker: 'Cleaver Stalker',
    brute: 'Pipe Brute',
    duelist: 'Shadow Duelist',
    warden: 'Dump Warden',
    boss: 'Overlord of the Dump',
  },
  skills: {
    chain_cleave: {
      name: 'Chain Cleave',
      shortDesc: 'Primary · Fast 3-hit directional combo',
      fullDesc: 'Rapid 3-strike cleaver combo aimed with Right Stick. Third hit lunges forward with heavy knockback and hot sparks.',
    },
    heavy_breaker: {
      name: 'Heavy Breaker',
      shortDesc: 'Primary · Crushing 2-hit shock slam',
      fullDesc: 'Heavy two-stroke iron slam. Wide sweeping reach that shatters enemy poise, triggers shockwave sparks, and breaks armor.',
    },
    twin_fangs: {
      name: 'Twin Fangs',
      shortDesc: 'Primary · Rapid dual bleed slashes',
      fullDesc: 'Hyper-fast dual cross-slashes with minimal cooldown. Carves rapid bleed ticks into targets while keeping high mobility.',
    },
    whirlwind_rend: {
      name: 'Whirlwind Rend',
      shortDesc: 'Secondary · 360° spinning slash',
      fullDesc: 'Spinning 360-degree steel arc with forward momentum. Cuts every surrounding enemy simultaneously and blasts sparks outward.',
    },
    phantom_thrust: {
      name: 'Phantom Thrust',
      shortDesc: 'Secondary · Piercing dash lunge',
      fullDesc: 'High-velocity piercing lunge along your Right Stick aim. Cuts through multiple foes in a line and staggers them.',
    },
    spark_nova_slash: {
      name: 'Spark Nova Slash',
      shortDesc: 'Secondary · Electrified blade fan',
      fullDesc: 'Sweeping slash that launches 5 glowing high-voltage steel sparks forward in a fan, lighting dark corridors and piercing foes.',
    },
  },
  artifacts: {
    blood_fang: { name: 'Blood Fang', desc: 'Heal +10% of damage dealt (100 dmg = +10 HP)' },
    spark_coil: { name: 'Spark Coil', desc: 'Successful parry unleashes a 45 dmg electric shockwave' },
    rust_flywheel: { name: 'Rust Flywheel', desc: 'Attack speed +20% and dash distance +15%' },
    tungsten_shard: { name: 'Tungsten Shard', desc: '+15% base damage and +60% parry riposte crit' },
    kerosene_heart: { name: 'Kerosene Heart', desc: '+35% lamp radius and +15% damage near enemies' },
    adrenaline_syringe: { name: 'Adrenaline Shot', desc: 'Kills instantly reset dash cooldown and boost speed' },
    bone_plate: { name: 'Bone Plate', desc: '-18% incoming damage, +15 max HP, knockback on hit' },
    serrated_edge: { name: 'Serrated Edge', desc: 'Strikes inflict +25% bonus bleed damage over 2.5s' },
    vampiric_heart: { name: 'Vampiric Heart', desc: 'Below 45% HP: +20% damage dealt and +8% lifesteal' },
    rust_spring: { name: 'Rust Spring', desc: '-16% skill cooldowns and +10% attack speed' },
    glass_edge: { name: 'Glass Edge', desc: '+30% all damage dealt, but +15% incoming damage' },
    oil_wick: { name: 'Oil Wick', desc: '+25% lamp radius and boosted oil/artifact drop odds' },
    static_boots: { name: 'Static Boots', desc: 'Dashing discharges 22 electric damage around you' },
    iron_knuckle: { name: 'Iron Knuckle', desc: '+35% stagger duration and heavier hit knockback' },
  },
};

const RU: TranslationDict = {
  gameTitle: 'ДЕ_ДАМП',
  tagline: 'Начни. Умри. Повтори.',
  enterCellar: 'Войти в подвал',
  autoBench: 'Авто-графика / Бенч',
  settings: 'Настройки',
  resume: 'Продолжить',
  restart: 'Начать заново',
  mainMenu: 'В главное меню',
  retry: 'Спуститься снова',
  paused: 'ПАУЗА',
  gameOver: 'ТЫ ПАЛ В ТЕМНОТЕ',
  lightWentOut: 'Лампа погасла',
  settingsTitle: 'НАСТРОЙКИ',
  languageLabel: 'Язык',
  languageValue: 'Русский',
  difficultyLabel: 'Сложность',
  difficultyValues: { normal: 'Обычный', hard: 'Сложный', nightmare: 'Кошмар' },
  controllerLabel: 'Геймпад',
  controllerValues: { ps: 'PlayStation', xbox: 'Xbox' },
  fullscreenLabel: 'Полный экран',
  soundLabel: 'Эффекты',
  musicLabel: 'Музыка',
  graphicsLabel: 'Графика',
  graphicsValues: { high: 'Выс. (270p)', medium: 'Сред. (216p)', low: 'Низк. (180p)' },
  fpsLimitLabel: 'Лимит FPS',
  fpsUnlimited: 'Без лимита',
  uiScaleLabel: 'Размер UI',
  uiOpacityLabel: 'Прозрачн. UI',
  shakeLabel: 'Тряска камеры',
  hitStopLabel: 'Хит-стоп',
  showFpsLabel: 'Счётчик FPS',
  deepSettingsLabel: 'Рандом фичи',
  deepSettingsTitle: 'РАНДОМ ФИЧИ',
  deepWipNote: 'Экспериментальные фичи, стартовый гайд и трейлер',
  trailerLabel: 'Трейлер игры',
  trailerTitle: 'ДЕ_ДАМП // ТРЕЙЛЕР',
  trailerHint: 'Перезапуск / Выход на геймпаде или мышью',
  trailerScenes: [
    'ГЛУБОКО ПОД БЕТОНОМ...',
    'ТОЛЬКО ЛАМПА РЕЖЕТ ТЕМНОТУ.',
    'ПАРИРУЙ БАГРОВЫЙ БЛИК.',
    'КРУШИ ВРАГОВ. СОБИРАЙ РЕЛИКВИИ.',
    'ВЛАДЫКА ЖДЁТ НА КАЖДОМ 10 ЭТАЖЕ.',
    'ДЕ_ДАМП — НАЧНИ. УМРИ. ПОВТОРИ.',
  ],
  replayIntroLabel: 'Приветствие и гайд',
  stretchLabel: 'Растяг экрана',
  fullbrightLabel: 'Fullbright (свет)',
  colorModeLabel: 'Палитра цветов',
  colorModeValues: { default: 'Обычная', cold: 'Холодная сталь', rust: 'Ржавая кровь', toxic: 'Кислотный дамп' },
  noTexturesLabel: 'Убрать текстуры',
  callsignLabel: 'Имя бойца',
  controlsLabel: 'Управление',
  welcomeTitle: 'ДОБРО ПОЖАЛОВАТЬ В ДЕ_ДАМП',
  welcomeSubtitle: 'Настрой игру в 6 шагов перед спуском в подвал. Всё сохраняется автоматически.',
  welcomeStartBtn: 'Войти в ДЕ_ДАМП',
  welcomeStepOf: (step, total) => `ЭТАП ${step} / ${total}`,
  welcomeNext: 'Далее',
  welcomePrev: 'Назад',
  welcomeSkip: 'Пропустить',
  welcomeSteps: {
    langTitle: '1. ВЫБОР ЯЗЫКА',
    langDesc: 'Внизу остались только керосиновая лампа и сталь. Выбери язык интерфейса.',
    padTitle: '2. ТИП ГЕЙМПАДА',
    padDesc: 'Игра заточена под геймпад. Выбери раскладку подсказок и кнопок.',
    diffTitle: '3. СЛОЖНОСТЬ',
    diffDesc: 'Выше сложность — злее, быстрее и жирнее враги и боссы.',
    diffBars: {
      normal: { hp: 45, speed: 50, dmg: 45, note: 'Сбалансированный спуск для освоения парирования.' },
      hard: { hp: 75, speed: 78, dmg: 75, note: 'Основной хардкорный баланс. Жёсткая динамика.' },
      nightmare: { hp: 100, speed: 100, dmg: 100, note: 'Смертельные замахи, плотные волны и охрана у босса.' },
    },
    gfxTitle: '4. КАЧЕСТВО ГРАФИКИ',
    gfxDesc: 'Живое превью пиксельного рендера и света от лампы.',
    gfxNotes: {
      high: 'Чёткие 480×270 + полный аддитивный свет и искры.',
      medium: '384×216 + полное освещение (лучший баланс для телефонов).',
      low: '320×180 режим макс. FPS, облегчённый рендер свечения.',
    },
    guideTitle: '5. ГАЙД ПО ВЫЖИВАНИЮ',
    guideDesc: 'Запомни три главных правила, чтобы не лечь на первом же этаже.',
    guideParryTitle: 'ПАРИРУЙ КРАСНЫЕ БЛИКИ',
    guideParryDesc: 'Когда оружие врага вспыхивает красным — жми Парир! Враг оглушится и получит огромный крит.',
    guideAimTitle: 'ДВА СТИКА И НАВЫКИ',
    guideAimDesc: 'Левый стик — шаг, Правый стик — прицел удара. Ищи Книги Навыков и меняй их в инвентаре.',
    guideLootTitle: 'РЕЛИКВИИ И ЛЮК',
    guideLootDesc: 'Ломай ящики и шкафчики ради Артефактов и масла. Убей всех врагов на этаже, чтобы открыть люк.',
    readyTitle: '6. ВСЁ ГОТОВО К СПУСКУ',
    readyDesc: 'Параметры сохранены. В любой момент их можно сменить в Настройках или через Бенчмарк.',
  },
  crashTitle: 'БЕЗОПАСНАЯ СРЕДА // ДЕТЕКТОР КРАША',
  crashSubtitle: 'Обнаружена ошибка выполнения. Логи сохранены, чтобы их можно было скопировать даже после сбоя.',
  crashCopy: 'Скопировать лог',
  crashCopied: 'Скопировано!',
  crashContinue: 'Попробовать продолжить',
  crashReset: 'Очистить и перезапустить',
  on: 'ВКЛ',
  off: 'ВЫКЛ',
  yes: 'Да',
  no: 'Нет',
  back: 'Назад',
  close: 'Закрыть',
  controlsTitle: 'УПРАВЛЕНИЕ ГЕЙМПАДОМ',
  ctrlMove: 'Левый стик',
  ctrlMoveDesc: 'Движение',
  ctrlAim: 'Правый стик',
  ctrlAimDesc: 'Направление ударов',
  ctrlR2Desc: 'Основная атака',
  ctrlR1Desc: 'Дополнительный навык',
  ctrlParryDesc: 'Парирование (оглушение)',
  ctrlDashDesc: 'Рывок (неуязвимость)',
  ctrlLootDesc: 'Лут / Книга / Люк',
  ctrlInvDesc: 'Открыть инвентарь',
  ctrlKb: 'Клавиатура (резерв)',
  ctrlKbDesc: 'WASD · Мышь · ЛКМ/J (Осн.) · Q/СКМ (Навык) · ПКМ · Пробел · E · Tab',
  hp: 'ЗДОРОВЬЕ',
  dash: 'РЫВОК',
  lamp: 'ЛАМПА',
  floor: 'ЭТАЖ',
  hatchOpen: 'Люк открыт',
  enemiesCount: (alive, total) => `Враги: ${alive}/${total}`,
  bossBadge: 'ЭТАЖ БОССА',
  statFloor: 'Этаж',
  statTime: 'Время',
  statKills: 'Убито',
  statParries: 'Парирований',
  statArtifacts: 'Артефакты',
  hudAttackR2: 'Основа',
  hudAttackR1: 'Навык',
  hudParry: 'Парир',
  hudDash: 'Рывок',
  hudLoot: 'Лут',
  hudInv: 'Инв.',
  hudPause: 'Пауза',
  corridor: 'Коридор',
  parryShout: 'ПАРИРОВАНИЕ!',
  toastFloor1Title: 'ЭТАЖ 1: ДЕ_ДАМП',
  toastFloor1Sub: 'Парируй блики · Выживи в темноте',
  toastFloorNTitle: (n) => `ЭТАЖ ${n}`,
  toastFloorNSub: 'Враги злее, быстрее и опаснее',
  toastBossTitle: (n) => `ЭТАЖ ${n}: БОСС`,
  toastBossSub: 'Победи Владыку Дампа, чтобы открыть люк',
  toastHatchTitle: 'ЛЮК ОТКРЫТ',
  toastHatchSub: 'Спускайся в отсеке выхода',
  toastArtifactPrefix: 'АРТЕФАКТ',
  toastSkillPrefix: 'КНИГА О НОВОМ НАВЫКЕ',
  promptTakeArtifact: (name) => `ВЗЯТЬ: ${name}`,
  promptTakeSkillBook: (name) => `КНИГА НАВЫКА: ${name}`,
  promptUnlockLocker: 'ВЗЛОМАТЬ ШКАФЧИК',
  promptSearchCrate: 'ОБЫСКАТЬ ЯЩИК',
  promptDescend: (n) => `СПУСТИТЬСЯ НА ЭТАЖ ${n}`,
  promptHatchLocked: (n) => `ЛЮК ЗАПЕРТ (ВРАГОВ: ${n})`,
  floatLamp: '+МАСЛО',
  skillBookTitle: 'КНИГА О НОВОМ НАВЫКЕ',
  skillBookQuestion: 'Хочешь ли ты посмотреть, как этот навык работает?',
  skillPreviewHint: 'Экипируется на Основу / Доп. в Инвентаре',
  skillCategoryPrimary: 'ОСНОВА',
  skillCategorySecondary: 'ДОП.',
  invTitle: 'ИНВЕНТАРЬ',
  invTabCharacter: 'seq',
  invTabSkills: 'Навыки',
  invTabArtifacts: 'Артефакты',
  invCharLore: 'Боец: seq · Застрял в нижних ярусах с керосиновой лампой и сталью.',
  invStatsDamage: 'Базовый урон',
  invStatsAtkSpeed: 'Скорость атак',
  invStatsLifesteal: 'Вампиризм',
  invStatsRiposte: 'Рипост',
  invStatsDefense: 'Защита',
  invStatsBleed: 'Кровоток',
  invStatsLamp: 'Радиус лампы',
  invStatsCooldown: 'Ускор. КД',
  invSkillAssignR2: 'На Основу',
  invSkillAssignR1: 'На Доп.',
  invSkillEquippedR2: 'ОСНОВА',
  invSkillEquippedR1: 'ДОП.',
  invSkillLocked: 'Найди книгу о новом навыке в подвале',
  invNoArtifacts: 'Артефактов пока нет. Ломай ящики и шкафчики.',
  invInspectHint: 'Наведи курсор на артефакт, чтобы увидеть его эффект',
  invGamepadLegend: (g) =>
    `${g.l1.split(' ')[0]} / ${g.r1} Вкладки · D-Pad Выбор · ${g.confirm} На Основу · ${g.square} На Доп. · ${g.back} Закрыть`,
  benchTitle: 'АВТО-ГРАФИКА / БЕНЧМАРК',
  benchDesc: 'Замеряет реальную производительность освещения и частиц и подбирает графику под желаемый FPS.',
  benchTargetFps: 'Желаемый FPS',
  benchRunBtn: 'Запустить 3с бенчмарк',
  benchRunning: 'Тестирую нагрузку подвала...',
  benchApplyBtn: 'Применить настройки',
  benchResultAvg: 'Средний FPS',
  benchResultRecommended: 'Авто-профиль',
  benchAppliedToast: 'Применено!',
  menuTips: [
    'СОВЕТ: Правый стик направляет удары независимо от движения.',
    'СОВЕТ: Каждые 10 этажей — Босс, каждые 20 — новая архитектура.',
    'СОВЕТ: В «Рандом фичи» есть трейлер игры и реалистичный звук.',
    'СОВЕТ: Парируй красные блики для сокрушительного рипоста.',
    'СОВЕТ: В Настройках можно переключить сложность и иконки PlayStation / Xbox.',
  ],
  rooms: {
    MAIN: ['Главный зал'],
    ALCOVE: ['Сырая камера', 'Ржавый отсек', 'Тёмная ниша', 'Топочная'],
    STORAGE: ['Склад припасов'],
    EXIT: ['Спуск глубже'],
  },
  enemies: {
    stalker: 'Гончий с тесаком',
    brute: 'Тяжёлый костолом',
    duelist: 'Тень-дуэлянт',
    warden: 'Страж Дампа',
    boss: 'Владыка Дампа',
  },
  skills: {
    chain_cleave: {
      name: 'Цепной разрез',
      shortDesc: 'Основа · Быстрая серия из 3 ударов',
      fullDesc: 'Скоростная серия из 3 ударов в направлении правого стика. Третий удар делает выпад вперёд с отбрасыванием и искрами.',
    },
    heavy_breaker: {
      name: 'Тяжёлый дробитель',
      shortDesc: 'Основа · Сокрушительный двойной удар',
      fullDesc: 'Тяжёлый двухударный размах с широкой дугой. Пробивает стойку, поднимает ударную волну искр и сильно отталкивает врагов.',
    },
    twin_fangs: {
      name: 'Парные клыки',
      shortDesc: 'Основа · Молниеносные режущие удары',
      fullDesc: 'Сверхбыстрые перекрёстные удары с минимальной задержкой. Накладывают кровотечение и позволяют мгновенно маневрировать.',
    },
    whirlwind_rend: {
      name: 'Вихрь лезвий',
      shortDesc: 'Доп. · Круговой удар на 360°',
      fullDesc: 'Мощный круговой замах на 360° с рывком вперёд. Рассекает всех врагов вокруг и запускает сноп горячих искр.',
    },
    phantom_thrust: {
      name: 'Призрачный выпад',
      shortDesc: 'Доп. · Пронзающий рывок-укол',
      fullDesc: 'Молниеносный пробивной выпад по правому стику. Пронзает нескольких врагов на линии и оглушает их.',
    },
    spark_nova_slash: {
      name: 'Искровая дуга',
      shortDesc: 'Доп. · Веер заряженных искр',
      fullDesc: 'Широкий взмах, выпускающий веер из 5 светящихся искровых клинков вперёд. Освещает темноту и пробивает цели на расстоянии.',
    },
  },
  artifacts: {
    blood_fang: { name: 'Кровавый клык', desc: 'Хил +10% от нанесённого урона (100 урона = +10 HP)' },
    spark_coil: { name: 'Искра контакта', desc: 'Парирование выпускает разряд на 45 урона вокруг' },
    rust_flywheel: { name: 'Ржавый маховик', desc: 'Скорость атак +20%, дальность рывка +15%' },
    tungsten_shard: { name: 'Осколок вольфрама', desc: '+15% базовый урон и +60% крит после парирования' },
    kerosene_heart: { name: 'Керосиновое сердце', desc: 'Радиус лампы +35%, +15% урона вблизи света' },
    adrenaline_syringe: { name: 'Шприц адреналина', desc: 'Убийство сбрасывает рывок и ускоряет бег' },
    bone_plate: { name: 'Костяной щиток', desc: '-18% входящего урона, +15 макс. HP и отталкивание' },
    serrated_edge: { name: 'Зазубренное лезвие', desc: 'Удары вызывают кровотечение (+25% урона за 2.5с)' },
    vampiric_heart: { name: 'Сердце упыря', desc: 'При HP < 45%: +20% урона и +8% вампиризма' },
    rust_spring: { name: 'Ржавая пружина', desc: '-16% перезарядка навыков и +10% скорость атак' },
    glass_edge: { name: 'Стеклянная грань', desc: '+30% к твоему урону, но +15% входящего урона' },
    oil_wick: { name: 'Промасленный фитиль', desc: '+25% радиус лампы и повышенный шанс дропа' },
    static_boots: { name: 'Статические сапоги', desc: 'Рывок бьёт врагов вокруг разрядом на 22 урона' },
    iron_knuckle: { name: 'Железный кастет', desc: '+35% длительность оглушения и усиленный толчок' },
  },
};

export const I18N: Record<Lang, TranslationDict> = { en: EN, ru: RU };
