import { Lang } from './i18n';
import { DeepSettings, GameSettings, TargetFpsOption } from './types';

const STORAGE_CFG_KEY = 'the_dump_saved_cfg_v2';

export interface SavedUserConfig {
  lang: Lang;
  gameSettings: GameSettings;
  deepSettings: DeepSettings;
  sfxMuted: boolean;
  musicMuted: boolean;
  benchTargetFps: TargetFpsOption;
  setupCompleted: boolean;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  quality: 'high',
  fpsLimit: 0,
  uiScale: 1,
  uiOpacity: 1,
  shakeScale: 1,
  hitStopEnabled: true,
  showFps: false,
  difficulty: 'hard',
  controllerType: 'ps',
};

export const DEFAULT_DEEP_SETTINGS: DeepSettings = {
  stretchX: 1,
  fullbright: false,
  colorMode: 'default',
  noTextures: false,
  callsign: 'seq',
};

export function loadSavedConfig(): SavedUserConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CFG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedUserConfig>;
      return {
        lang: parsed.lang === 'ru' ? 'ru' : 'en',
        gameSettings: {
          ...DEFAULT_GAME_SETTINGS,
          ...(parsed.gameSettings ?? {}),
        },
        deepSettings: {
          ...DEFAULT_DEEP_SETTINGS,
          ...(parsed.deepSettings ?? {}),
        },
        sfxMuted: Boolean(parsed.sfxMuted),
        musicMuted: Boolean(parsed.musicMuted),
        benchTargetFps: parsed.benchTargetFps ?? 60,
        setupCompleted: Boolean(parsed.setupCompleted),
      };
    }
  } catch {
    // ignore corrupted storage
  }
  return {
    lang: 'en',
    gameSettings: { ...DEFAULT_GAME_SETTINGS },
    deepSettings: { ...DEFAULT_DEEP_SETTINGS },
    sfxMuted: false,
    musicMuted: false,
    benchTargetFps: 60,
    setupCompleted: false,
  };
}

export function saveConfig(cfg: SavedUserConfig) {
  try {
    localStorage.setItem(STORAGE_CFG_KEY, JSON.stringify(cfg));
  } catch {
    // ignore storage quota errors
  }
}
