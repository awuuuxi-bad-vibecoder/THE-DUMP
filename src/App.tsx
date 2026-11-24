import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BENCH_FPS_TARGETS } from './components/BenchmarkModal';
import { GameHUD } from './components/GameHUD';
import { GrittyMenu, MenuButtonDef, MenuSubView } from './components/GrittyMenu';
import { InventoryModal, InventoryTab } from './components/InventoryModal';
import { SkillPreviewModal } from './components/SkillPreviewModal';
import { WELCOME_TOTAL_STEPS, WelcomeModal } from './components/WelcomeModal';
import { sound } from './game/audio';
import { crashGuard } from './game/crashGuard';
import { GameEngine, LOGICAL_H, LOGICAL_W } from './game/engine';
import { GamepadManager } from './game/gamepad';
import { getGlyphs, I18N, Lang, saveLang } from './game/i18n';
import { music } from './game/music';
import { loadSavedConfig, saveConfig } from './game/settingsStorage';
import { ALL_SKILL_IDS, SKILLS } from './game/skills';
import {
  ColorFilterMode,
  ControllerType,
  DeepSettings,
  DifficultyMode,
  GameScreenState,
  GameSettings,
  GraphicsQuality,
  HUDState,
  SkillId,
  TargetFpsOption,
} from './game/types';

const QUALITY_RES: Record<GraphicsQuality, { w: number; h: number }> = {
  high: { w: LOGICAL_W, h: LOGICAL_H },
  medium: { w: 384, h: 216 },
  low: { w: 320, h: 180 },
};

const COLOR_MODES: ColorFilterMode[] = ['default', 'cold', 'rust', 'toxic'];
const STRETCH_OPTIONS = [1, 1.25, 1.5];
const CALLSIGN_OPTIONS = ['seq', 'seq_01', 'seq_dump', 'seq_x'];
const FPS_LIMIT_OPTIONS: TargetFpsOption[] = [0, 30, 60, 120, 144, 244];
const UI_SCALE_OPTIONS = [0.85, 1, 1.15];
const UI_OPACITY_OPTIONS = [0.65, 0.85, 1];
const SHAKE_OPTIONS = [1, 0.5, 0];
const DIFFICULTIES: DifficultyMode[] = ['normal', 'hard', 'nightmare'];
const QUALITIES: GraphicsQuality[] = ['high', 'medium', 'low'];

export default function App() {
  const initialCfg = useMemo(() => loadSavedConfig(), []);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gamepadRef = useRef<GamepadManager | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [lang, setLangState] = useState<Lang>(initialCfg.lang);
  const langRef = useRef<Lang>(lang);

  const [setupCompleted, setSetupCompleted] = useState<boolean>(initialCfg.setupCompleted);
  const setupCompletedRef = useRef<boolean>(setupCompleted);
  const [welcomeStep, setWelcomeStep] = useState(0);
  const welcomeStepRef = useRef(0);

  const [screen, setScreen] = useState<GameScreenState>('TITLE_MENU');
  const screenRef = useRef<GameScreenState>('TITLE_MENU');

  const [subView, setSubView] = useState<MenuSubView>('MAIN');
  const subViewRef = useRef<MenuSubView>('MAIN');

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedIndexRef = useRef(0);
  const menuColsRef = useRef(1);

  const [sfxMuted, setSfxMuted] = useState(initialCfg.sfxMuted);
  const [musicMuted, setMusicMuted] = useState(initialCfg.musicMuted);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => Boolean(document.fullscreenElement));
  const autoFullscreenWantedRef = useRef(true);

  const [gameSettings, setGameSettings] = useState<GameSettings>(initialCfg.gameSettings);
  const gameSettingsRef = useRef<GameSettings>(gameSettings);

  const [benchTargetFps, setBenchTargetFps] = useState<TargetFpsOption>(initialCfg.benchTargetFps);
  const [benchFocusRow, setBenchFocusRow] = useState(1);
  const benchFocusRowRef = useRef(1);
  const [benchConfirmSignal, setBenchConfirmSignal] = useState(0);
  const benchHasResultRef = useRef(false);

  const [trailerRestartSignal, setTrailerRestartSignal] = useState(0);

  const [deepSettings, setDeepSettings] = useState<DeepSettings>(initialCfg.deepSettings);

  // Inventory state + full gamepad cursors
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const inventoryOpenRef = useRef(false);
  const [inventoryTab, setInventoryTab] = useState<InventoryTab>('CHAR');
  const inventoryTabRef = useRef<InventoryTab>('CHAR');
  const [focusedSkillIdx, setFocusedSkillIdx] = useState(0);
  const focusedSkillIdxRef = useRef(0);
  const [focusedArtifactIdx, setFocusedArtifactIdx] = useState(0);

  // New Skill Book modal state
  const [skillPrompt, setSkillPrompt] = useState<{
    skillId: SkillId;
    mode: 'ASK' | 'SHOW';
    choice: number;
  } | null>(null);
  const skillPromptRef = useRef(skillPrompt);

  const [hud, setHud] = useState<HUDState | null>(null);
  const [measuredFps, setMeasuredFps] = useState(60);

  useEffect(() => {
    sound.setMuted(initialCfg.sfxMuted);
    music.setMuted(initialCfg.musicMuted);
    crashGuard.log('App mounted');
  }, [initialCfg]);

  useEffect(() => {
    screenRef.current = screen;
    crashGuard.setContext('screen', screen);
  }, [screen]);

  useEffect(() => {
    setupCompletedRef.current = setupCompleted;
  }, [setupCompleted]);

  useEffect(() => {
    welcomeStepRef.current = welcomeStep;
  }, [welcomeStep]);

  useEffect(() => {
    subViewRef.current = subView;
  }, [subView]);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    benchFocusRowRef.current = benchFocusRow;
  }, [benchFocusRow]);

  useEffect(() => {
    inventoryOpenRef.current = inventoryOpen;
  }, [inventoryOpen]);

  useEffect(() => {
    inventoryTabRef.current = inventoryTab;
  }, [inventoryTab]);

  useEffect(() => {
    focusedSkillIdxRef.current = focusedSkillIdx;
  }, [focusedSkillIdx]);

  useEffect(() => {
    skillPromptRef.current = skillPrompt;
  }, [skillPrompt]);

  useEffect(() => {
    langRef.current = lang;
    saveLang(lang);
    document.documentElement.lang = lang;
    engineRef.current?.setLang(lang);
  }, [lang]);

  useEffect(() => {
    gameSettingsRef.current = gameSettings;
    engineRef.current?.setGameSettings(gameSettings);
    crashGuard.setContext('quality', gameSettings.quality);
  }, [gameSettings]);

  useEffect(() => {
    engineRef.current?.setDeepSettings(deepSettings);
  }, [deepSettings]);

  // Persist all user settings automatically
  useEffect(() => {
    saveConfig({
      lang,
      gameSettings,
      deepSettings,
      sfxMuted,
      musicMuted,
      benchTargetFps,
      setupCompleted,
    });
  }, [lang, gameSettings, deepSettings, sfxMuted, musicMuted, benchTargetFps, setupCompleted]);

  const unlockAllAudio = useCallback(() => {
    sound.unlock();
    music.start();
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (document.fullscreenElement) return;
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Browser may require gesture first
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    autoFullscreenWantedRef.current = false;
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // ignore
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    if (document.fullscreenElement) {
      void exitFullscreen();
    } else {
      autoFullscreenWantedRef.current = true;
      void enterFullscreen();
    }
  }, [enterFullscreen, exitFullscreen, unlockAllAudio]);

  useEffect(() => {
    void enterFullscreen();

    const onFullscreenChange = () => {
      const fs = Boolean(document.fullscreenElement);
      setIsFullscreen(fs);
      crashGuard.log(fs ? 'Fullscreen entered' : 'Fullscreen exited');
    };

    const onFirstGesture = () => {
      unlockAllAudio();
      if (autoFullscreenWantedRef.current && !document.fullscreenElement) {
        void enterFullscreen();
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('pointerdown', onFirstGesture, { passive: true });
    window.addEventListener('keydown', onFirstGesture, { passive: true });

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      music.stop();
    };
  }, [enterFullscreen, unlockAllAudio]);

  const cycleWelcomeStepOption = useCallback(
    (stepIdx: number, dir: 1 | -1 = 1) => {
      unlockAllAudio();
      sound.playMenuSwitch();
      if (stepIdx === 0) {
        setLangState((prev) => (prev === 'en' ? 'ru' : 'en'));
      } else if (stepIdx === 1) {
        setGameSettings((gs) => ({
          ...gs,
          controllerType: gs.controllerType === 'ps' ? 'xbox' : 'ps',
        }));
      } else if (stepIdx === 2) {
        setGameSettings((gs) => {
          const i = DIFFICULTIES.indexOf(gs.difficulty);
          return { ...gs, difficulty: DIFFICULTIES[(i + dir + DIFFICULTIES.length) % DIFFICULTIES.length] };
        });
      } else if (stepIdx === 3) {
        setGameSettings((gs) => {
          const i = QUALITIES.indexOf(gs.quality);
          return { ...gs, quality: QUALITIES[(i + dir + QUALITIES.length) % QUALITIES.length] };
        });
      }
    },
    [unlockAllAudio]
  );

  const confirmWelcome = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    crashGuard.log('Welcome setup completed');
    setSetupCompleted(true);
    setWelcomeStep(0);
    setSelectedIndex(0);
    setSubView('MAIN');
    setScreen('TITLE_MENU');
  }, [unlockAllAudio]);

  const startGame = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    crashGuard.log('startNewRun');
    if (autoFullscreenWantedRef.current && !document.fullscreenElement) {
      void enterFullscreen();
    }
    engineRef.current?.startNewRun();
    setInventoryOpen(false);
    setSkillPrompt(null);
    setSubView('MAIN');
    setSelectedIndex(0);
    setScreen('PLAYING');
  }, [enterFullscreen, unlockAllAudio]);

  const resumeGame = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    setSubView('MAIN');
    setScreen('PLAYING');
  }, [unlockAllAudio]);

  const goToTitle = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    setInventoryOpen(false);
    setSkillPrompt(null);
    setSubView('MAIN');
    setSelectedIndex(0);
    setScreen('TITLE_MENU');
    music.setMusicMode('MENU');
  }, [unlockAllAudio]);

  const toggleLanguage = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    setLangState((prev) => (prev === 'en' ? 'ru' : 'en'));
  }, [unlockAllAudio]);

  const toggleSfx = useCallback(() => {
    unlockAllAudio();
    const next = !sound.isMuted();
    sound.setMuted(next);
    setSfxMuted(next);
    if (!next) sound.playMenuConfirm();
  }, [unlockAllAudio]);

  const toggleMusic = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    const next = !music.isMuted();
    music.setMuted(next);
    setMusicMuted(next);
  }, [unlockAllAudio]);

  const openSettings = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    setSubView('SETTINGS');
    setSelectedIndex(0);
  }, [unlockAllAudio]);

  const openBenchmark = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    setBenchFocusRow(1);
    setSubView('BENCH');
    setSelectedIndex(0);
  }, [unlockAllAudio]);

  const openDeepSettings = useCallback(() => {
    unlockAllAudio();
    sound.playMenuConfirm();
    setSubView('DEEP_SETTINGS');
    setSelectedIndex(0);
  }, [unlockAllAudio]);

  const closeSubView = useCallback(() => {
    unlockAllAudio();
    sound.playMenuSwitch();
    if (subViewRef.current === 'TRAILER') {
      setSubView('DEEP_SETTINGS');
      setSelectedIndex(0);
    } else if (subViewRef.current === 'CONTROLS' || subViewRef.current === 'DEEP_SETTINGS') {
      setSubView('SETTINGS');
      setSelectedIndex(0);
    } else {
      setSubView('MAIN');
      setSelectedIndex(0);
    }
  }, [unlockAllAudio]);

  const menuButtons: MenuButtonDef[] = useMemo(() => {
    const t = I18N[lang];
    const glyphs = getGlyphs(gameSettings.controllerType);

    if (subView === 'DEEP_SETTINGS') {
      return [
        {
          id: 'trailer',
          label: t.trailerLabel,
          valueText: '▶',
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setTrailerRestartSignal((n) => n + 1);
            setSubView('TRAILER');
          },
        },
        {
          id: 'replayIntro',
          label: t.replayIntroLabel,
          valueText: '→',
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setWelcomeStep(0);
            setSetupCompleted(false);
          },
        },
        {
          id: 'stretch',
          label: t.stretchLabel,
          valueText: `${Math.round(deepSettings.stretchX * 100)}%`,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setDeepSettings((ds) => {
              const next = STRETCH_OPTIONS[(STRETCH_OPTIONS.indexOf(ds.stretchX) + 1) % STRETCH_OPTIONS.length];
              return { ...ds, stretchX: next };
            });
          },
        },
        {
          id: 'fullbright',
          label: t.fullbrightLabel,
          valueText: deepSettings.fullbright ? t.on : t.off,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setDeepSettings((ds) => ({ ...ds, fullbright: !ds.fullbright }));
          },
        },
        {
          id: 'colorMode',
          label: t.colorModeLabel,
          valueText: t.colorModeValues[deepSettings.colorMode],
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setDeepSettings((ds) => {
              const next = COLOR_MODES[(COLOR_MODES.indexOf(ds.colorMode) + 1) % COLOR_MODES.length];
              return { ...ds, colorMode: next };
            });
          },
        },
        {
          id: 'noTextures',
          label: t.noTexturesLabel,
          valueText: deepSettings.noTextures ? t.on : t.off,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setDeepSettings((ds) => ({ ...ds, noTextures: !ds.noTextures }));
          },
        },
        {
          id: 'callsign',
          label: t.callsignLabel,
          valueText: deepSettings.callsign,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setDeepSettings((ds) => {
              const idx = CALLSIGN_OPTIONS.indexOf(ds.callsign);
              const next = CALLSIGN_OPTIONS[(idx + 1) % CALLSIGN_OPTIONS.length];
              return { ...ds, callsign: next };
            });
          },
        },
        {
          id: 'deep_back',
          label: t.back,
          valueText: glyphs.back,
          action: closeSubView,
        },
      ];
    }

    if (subView === 'SETTINGS') {
      return [
        {
          id: 'lang',
          label: t.languageLabel,
          valueText: t.languageValue,
          action: toggleLanguage,
        },
        {
          id: 'difficulty',
          label: t.difficultyLabel,
          valueText: t.difficultyValues[gameSettings.difficulty],
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => {
              const next = DIFFICULTIES[(DIFFICULTIES.indexOf(gs.difficulty) + 1) % DIFFICULTIES.length];
              return { ...gs, difficulty: next };
            });
          },
        },
        {
          id: 'controller',
          label: t.controllerLabel,
          valueText: t.controllerValues[gameSettings.controllerType],
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => ({
              ...gs,
              controllerType: gs.controllerType === 'ps' ? 'xbox' : 'ps',
            }));
          },
        },
        {
          id: 'fullscreen',
          label: t.fullscreenLabel,
          valueText: isFullscreen ? t.on : t.off,
          action: toggleFullscreen,
        },
        {
          id: 'graphics',
          label: t.graphicsLabel,
          valueText: t.graphicsValues[gameSettings.quality],
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => ({
              ...gs,
              quality: gs.quality === 'high' ? 'medium' : gs.quality === 'medium' ? 'low' : 'high',
            }));
          },
        },
        {
          id: 'fpsLimit',
          label: t.fpsLimitLabel,
          valueText: gameSettings.fpsLimit === 0 ? t.fpsUnlimited : `${gameSettings.fpsLimit}`,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => {
              const next = FPS_LIMIT_OPTIONS[(FPS_LIMIT_OPTIONS.indexOf(gs.fpsLimit) + 1) % FPS_LIMIT_OPTIONS.length];
              return { ...gs, fpsLimit: next };
            });
          },
        },
        {
          id: 'uiScale',
          label: t.uiScaleLabel,
          valueText: `${Math.round(gameSettings.uiScale * 100)}%`,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => {
              const next = UI_SCALE_OPTIONS[(UI_SCALE_OPTIONS.indexOf(gs.uiScale) + 1) % UI_SCALE_OPTIONS.length];
              return { ...gs, uiScale: next };
            });
          },
        },
        {
          id: 'uiOpacity',
          label: t.uiOpacityLabel,
          valueText: `${Math.round(gameSettings.uiOpacity * 100)}%`,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => {
              const next = UI_OPACITY_OPTIONS[(UI_OPACITY_OPTIONS.indexOf(gs.uiOpacity) + 1) % UI_OPACITY_OPTIONS.length];
              return { ...gs, uiOpacity: next };
            });
          },
        },
        {
          id: 'shake',
          label: t.shakeLabel,
          valueText: `${Math.round(gameSettings.shakeScale * 100)}%`,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => {
              const next = SHAKE_OPTIONS[(SHAKE_OPTIONS.indexOf(gs.shakeScale) + 1) % SHAKE_OPTIONS.length];
              return { ...gs, shakeScale: next };
            });
          },
        },
        {
          id: 'hitStop',
          label: t.hitStopLabel,
          valueText: gameSettings.hitStopEnabled ? t.on : t.off,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => ({ ...gs, hitStopEnabled: !gs.hitStopEnabled }));
          },
        },
        {
          id: 'showFps',
          label: t.showFpsLabel,
          valueText: gameSettings.showFps ? t.on : t.off,
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setGameSettings((gs) => ({ ...gs, showFps: !gs.showFps }));
          },
        },
        {
          id: 'music',
          label: t.musicLabel,
          valueText: musicMuted ? t.off : t.on,
          action: toggleMusic,
        },
        {
          id: 'sound',
          label: t.soundLabel,
          valueText: sfxMuted ? t.off : t.on,
          action: toggleSfx,
        },
        {
          id: 'controls',
          label: t.controlsLabel,
          valueText: gameSettings.controllerType === 'xbox' ? 'XBOX' : 'PS',
          action: () => {
            unlockAllAudio();
            sound.playMenuConfirm();
            setSubView('CONTROLS');
          },
        },
        {
          id: 'deep',
          label: t.deepSettingsLabel,
          valueText: '→',
          action: openDeepSettings,
        },
        {
          id: 'back',
          label: t.back,
          valueText: glyphs.back,
          action: closeSubView,
        },
      ];
    }

    if (screen === 'TITLE_MENU') {
      return [
        { id: 'start', label: t.enterCellar, action: startGame },
        { id: 'bench', label: t.autoBench, action: openBenchmark },
        { id: 'settings', label: t.settings, action: openSettings },
      ];
    }

    if (screen === 'PAUSED') {
      return [
        { id: 'resume', label: t.resume, action: resumeGame },
        { id: 'settings', label: t.settings, action: openSettings },
        { id: 'restart', label: t.restart, action: startGame },
        { id: 'menu', label: t.mainMenu, action: goToTitle },
      ];
    }

    return [
      { id: 'retry', label: t.retry, action: startGame },
      { id: 'menu', label: t.mainMenu, action: goToTitle },
    ];
  }, [
    lang,
    subView,
    screen,
    deepSettings,
    isFullscreen,
    gameSettings,
    musicMuted,
    sfxMuted,
    unlockAllAudio,
    toggleLanguage,
    toggleFullscreen,
    toggleMusic,
    toggleSfx,
    openDeepSettings,
    closeSubView,
    startGame,
    openBenchmark,
    openSettings,
    resumeGame,
    goToTitle,
  ]);

  const menuButtonsRef = useRef<MenuButtonDef[]>(menuButtons);
  useEffect(() => {
    menuButtonsRef.current = menuButtons;
  }, [menuButtons]);

  useEffect(() => {
    const gp = new GamepadManager();
    const engine = new GameEngine(gp);
    engine.setLang(langRef.current);
    engine.setGameSettings(gameSettingsRef.current);
    engine.setDeepSettings(deepSettings);
    gamepadRef.current = gp;
    engineRef.current = engine;

    const initialInput = gp.poll();
    setHud(engine.getHUDState(initialInput));

    let animId = 0;
    let lastTime = performance.now();
    let lastRenderTime = lastTime;
    let hudTick = 0;
    let fpsCounter = 0;
    let fpsTimer = 0;

    const loop = (now: number) => {
      try {
        const cap = gameSettingsRef.current.fpsLimit;
        const minStepMs = cap > 0 ? 1000 / cap : 0;

        if (minStepMs > 0 && now - lastRenderTime < minStepMs * 0.92) {
          animId = requestAnimationFrame(loop);
          return;
        }

        const dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;
        lastRenderTime = now;

        fpsCounter++;
        fpsTimer += dt;
        if (fpsTimer >= 0.5) {
          if (gameSettingsRef.current.showFps) {
            setMeasuredFps(Math.round(fpsCounter / fpsTimer));
          }
          fpsCounter = 0;
          fpsTimer = 0;
        }

        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          gp.setCanvasCenter(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
        }

        const input = gp.poll();

        if (
          autoFullscreenWantedRef.current &&
          !document.fullscreenElement &&
          (input.menuConfirm || input.attackR2Pressed || input.dashPressed)
        ) {
          unlockAllAudio();
          void enterFullscreen();
        }

        const curScreen = screenRef.current;
        const curPrompt = skillPromptRef.current;
        const curInv = inventoryOpenRef.current;

        if (!setupCompletedRef.current) {
          // 6-step Welcome & Initial Guide wizard navigation
          music.setMusicMode('MENU');
          if (input.menuLeft || input.menuRight) {
            const cur = welcomeStepRef.current;
            if (cur <= 3) {
              cycleWelcomeStepOption(cur, input.menuRight ? 1 : -1);
            }
          } else if (input.menuL1) {
            unlockAllAudio();
            sound.playMenuSwitch();
            setWelcomeStep((s) => Math.max(0, s - 1));
          } else if (input.menuR1) {
            unlockAllAudio();
            sound.playMenuSwitch();
            setWelcomeStep((s) => Math.min(WELCOME_TOTAL_STEPS - 1, s + 1));
          } else if (input.menuBack) {
            if (welcomeStepRef.current > 0) {
              unlockAllAudio();
              sound.playMenuSwitch();
              setWelcomeStep((s) => Math.max(0, s - 1));
            }
          } else if (input.menuConfirm) {
            if (welcomeStepRef.current >= WELCOME_TOTAL_STEPS - 1) {
              confirmWelcome();
            } else {
              unlockAllAudio();
              sound.playMenuConfirm();
              setWelcomeStep((s) => Math.min(WELCOME_TOTAL_STEPS - 1, s + 1));
            }
          }
        } else if (curScreen === 'PLAYING') {
        if (curPrompt) {
          if (curPrompt.mode === 'ASK') {
            if (input.menuLeft || input.menuRight || input.menuUp || input.menuDown) {
              sound.playMenuSwitch();
              setSkillPrompt((prev) => (prev ? { ...prev, choice: prev.choice === 0 ? 1 : 0 } : null));
            } else if (input.menuConfirm) {
              sound.playMenuConfirm();
              setSkillPrompt((prev) => {
                if (!prev) return null;
                return prev.choice === 0 ? { ...prev, mode: 'SHOW' } : null;
              });
            } else if (input.menuBack) {
              sound.playMenuSwitch();
              setSkillPrompt(null);
            }
          } else {
            if (input.menuConfirm || input.menuBack || input.pausePressed) {
              sound.playMenuSwitch();
              setSkillPrompt(null);
            }
          }
          music.setMusicMode('CALM');
        } else if (curInv) {
          // FULL PLAYSTATION / XBOX GAMEPAD INVENTORY NAVIGATION
          if (input.inventoryPressed || input.menuBack || input.pausePressed) {
            sound.playMenuSwitch();
            setInventoryOpen(false);
          } else if (input.menuL1) {
            sound.playMenuSwitch();
            setInventoryTab((tb) => (tb === 'CHAR' ? 'ARTIFACTS' : tb === 'SKILLS' ? 'CHAR' : 'SKILLS'));
          } else if (input.menuR1) {
            sound.playMenuSwitch();
            setInventoryTab((tb) => (tb === 'CHAR' ? 'SKILLS' : tb === 'SKILLS' ? 'ARTIFACTS' : 'CHAR'));
          } else {
            const tab = inventoryTabRef.current;
            if (tab === 'CHAR') {
              if (input.menuLeft) {
                sound.playMenuSwitch();
                setInventoryTab('ARTIFACTS');
              } else if (input.menuRight) {
                sound.playMenuSwitch();
                setInventoryTab('SKILLS');
              }
            } else if (tab === 'SKILLS') {
              if (input.menuLeft) {
                sound.playMenuSwitch();
                setInventoryTab('CHAR');
              } else if (input.menuRight) {
                sound.playMenuSwitch();
                setInventoryTab('ARTIFACTS');
              } else if (input.menuUp) {
                sound.playMenuSwitch();
                setFocusedSkillIdx((prev) => (prev - 1 + ALL_SKILL_IDS.length) % ALL_SKILL_IDS.length);
              } else if (input.menuDown) {
                sound.playMenuSwitch();
                setFocusedSkillIdx((prev) => (prev + 1) % ALL_SKILL_IDS.length);
              } else if (input.menuConfirm || input.menuSquare || input.menuR2) {
                const skillId = ALL_SKILL_IDS[focusedSkillIdxRef.current];
                const stateNow = engine.getHUDState(input);
                if (stateNow.unlockedSkills.includes(skillId)) {
                  sound.playMenuConfirm();
                  const def = SKILLS[skillId];
                  engine.assignSkillSlot(def.category === 'PRIMARY' ? 'R2' : 'R1', skillId);
                  setHud(engine.getHUDState(input));
                }
              }
            } else if (tab === 'ARTIFACTS') {
              const stateNow = engine.getHUDState(input);
              const artCount = stateNow.artifacts.length;
              if (artCount === 0) {
                if (input.menuLeft) setInventoryTab('SKILLS');
                if (input.menuRight) setInventoryTab('CHAR');
              } else {
                if (input.menuLeft) {
                  sound.playMenuSwitch();
                  setFocusedArtifactIdx((prev) => (prev - 1 + artCount) % artCount);
                } else if (input.menuRight) {
                  sound.playMenuSwitch();
                  setFocusedArtifactIdx((prev) => (prev + 1) % artCount);
                } else if (input.menuUp) {
                  sound.playMenuSwitch();
                  setFocusedArtifactIdx((prev) => (prev - 4 + artCount) % artCount);
                } else if (input.menuDown) {
                  sound.playMenuSwitch();
                  setFocusedArtifactIdx((prev) => (prev + 4) % artCount);
                }
              }
            }
          }
          music.setMusicMode('CALM');
        } else if (input.inventoryPressed) {
          unlockAllAudio();
          sound.playMenuSwitch();
          setInventoryOpen(true);
          music.setMusicMode('CALM');
        } else if (input.pausePressed) {
          unlockAllAudio();
          sound.playMenuSwitch();
          setSubView('MAIN');
          setSelectedIndex(0);
          setScreen('PAUSED');
          music.setMusicMode('MENU');
        } else {
          engine.update(dt, input);
          if (engine.pendingSkillBookPrompt) {
            const skId = engine.pendingSkillBookPrompt;
            engine.pendingSkillBookPrompt = null;
            setSkillPrompt({ skillId: skId, mode: 'ASK', choice: 0 });
          }
          if (engine.isGameOver()) {
            setSubView('MAIN');
            setSelectedIndex(0);
            setScreen('GAME_OVER');
            music.setMusicMode('MENU');
          } else {
            const stateSnap = engine.getHUDState(input);
            music.setMusicMode(stateSnap.inCombat ? 'COMBAT' : 'CALM');
          }
        }
      } else {
        // Pure drum breakbeat menu OST
        music.setMusicMode('MENU');
        if (subViewRef.current === 'CONTROLS') {
          if (input.menuBack || input.menuConfirm) {
            closeSubView();
          }
        } else if (subViewRef.current === 'TRAILER') {
          if (input.menuBack) {
            closeSubView();
          } else if (input.menuConfirm) {
            sound.playMenuConfirm();
            setTrailerRestartSignal((n) => n + 1);
          }
        } else if (subViewRef.current === 'BENCH') {
          const validRows = benchHasResultRef.current ? [0, 1, 2, 3] : [0, 1, 3];
          const actionRows = benchHasResultRef.current ? [1, 2, 3] : [1, 3];

          if (input.menuBack) {
            closeSubView();
          } else if (input.menuUp) {
            unlockAllAudio();
            sound.playMenuSwitch();
            setBenchFocusRow((cur) => {
              const i = validRows.indexOf(cur);
              return validRows[(i - 1 + validRows.length) % validRows.length];
            });
          } else if (input.menuDown) {
            unlockAllAudio();
            sound.playMenuSwitch();
            setBenchFocusRow((cur) => {
              const i = validRows.indexOf(cur);
              return validRows[(i + 1) % validRows.length];
            });
          } else if (input.menuLeft || input.menuRight) {
            unlockAllAudio();
            sound.playMenuSwitch();
            if (benchFocusRowRef.current === 0) {
              setBenchTargetFps((cur) => {
                const i = BENCH_FPS_TARGETS.indexOf(cur);
                const delta = input.menuRight ? 1 : -1;
                return BENCH_FPS_TARGETS[(i + delta + BENCH_FPS_TARGETS.length) % BENCH_FPS_TARGETS.length];
              });
            } else {
              setBenchFocusRow((cur) => {
                const i = actionRows.indexOf(cur);
                const delta = input.menuRight ? 1 : -1;
                return actionRows[(i + delta + actionRows.length) % actionRows.length];
              });
            }
          } else if (input.menuConfirm) {
            unlockAllAudio();
            sound.playMenuConfirm();
            setBenchConfirmSignal((n) => n + 1);
          }
        } else {
          const btns = menuButtonsRef.current;
          const cols = menuColsRef.current;
          if (input.menuUp) {
            unlockAllAudio();
            sound.playMenuSwitch();
            setSelectedIndex((prev) => (prev - cols + btns.length) % btns.length);
          } else if (input.menuDown) {
            unlockAllAudio();
            sound.playMenuSwitch();
            setSelectedIndex((prev) => (prev + cols) % btns.length);
          } else if (cols > 1 && input.menuLeft) {
            unlockAllAudio();
            sound.playMenuSwitch();
            setSelectedIndex((prev) => (prev - 1 + btns.length) % btns.length);
          } else if (cols > 1 && input.menuRight) {
            unlockAllAudio();
            sound.playMenuSwitch();
            setSelectedIndex((prev) => (prev + 1) % btns.length);
          } else if (input.menuConfirm) {
            unlockAllAudio();
            const idx = Math.min(selectedIndexRef.current, btns.length - 1);
            btns[idx]?.action();
          } else if (
            input.menuBack &&
            (subViewRef.current === 'SETTINGS' || subViewRef.current === 'DEEP_SETTINGS')
          ) {
            closeSubView();
          } else if (input.pausePressed && curScreen === 'PAUSED') {
            resumeGame();
          }
        }
      }

        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (curScreen === 'TITLE_MENU') {
              engine.renderMenuBackdrop(ctx, now);
            } else {
              engine.render(ctx);
            }
          }
        }

        hudTick += dt;
        if (setupCompletedRef.current && curScreen === 'PLAYING' && hudTick >= 0.045) {
          hudTick = 0;
          const snap = engine.getHUDState(input);
          crashGuard.setContext('floor', snap.floor);
          setHud(snap);
        }
      } catch (err) {
        crashGuard.reportError('GameLoop', err);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      gp.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeSubView, enterFullscreen, resumeGame, unlockAllAudio, cycleWelcomeStepOption, confirmWelcome]);

  const handleSelectIndex = useCallback(
    (idx: number) => {
      if (idx !== selectedIndexRef.current) {
        unlockAllAudio();
        sound.playMenuSwitch();
        setSelectedIndex(idx);
      }
    },
    [unlockAllAudio]
  );

  const handleColsChange = useCallback((cols: number) => {
    menuColsRef.current = cols;
  }, []);

  const handleAssignSkill = useCallback((slot: 'R1' | 'R2', skillId: SkillId) => {
    sound.playMenuConfirm();
    engineRef.current?.assignSkillSlot(slot, skillId);
    if (gamepadRef.current) {
      const snap = gamepadRef.current.poll();
      if (engineRef.current) setHud(engineRef.current.getHUDState(snap));
    }
  }, []);

  const res = QUALITY_RES[gameSettings.quality];

  return (
    <main className="relative w-screen h-screen bg-[#050507] flex items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={res.w}
        height={res.h}
        className="w-full h-full object-contain pixelated transition-transform duration-150"
        style={{
          transform: deepSettings.stretchX !== 1 ? `scaleX(${deepSettings.stretchX})` : undefined,
        }}
      />

      {!setupCompleted && (
        <WelcomeModal
          lang={lang}
          settings={gameSettings}
          step={welcomeStep}
          onSetStep={(s) => {
            unlockAllAudio();
            sound.playMenuSwitch();
            setWelcomeStep(s);
          }}
          onSetLang={(l: Lang) => {
            unlockAllAudio();
            sound.playMenuSwitch();
            setLangState(l);
          }}
          onSetController={(ct: ControllerType) => {
            unlockAllAudio();
            sound.playMenuSwitch();
            setGameSettings((gs) => ({ ...gs, controllerType: ct }));
          }}
          onSetDifficulty={(diff: DifficultyMode) => {
            unlockAllAudio();
            sound.playMenuSwitch();
            setGameSettings((gs) => ({ ...gs, difficulty: diff }));
          }}
          onSetQuality={(q: GraphicsQuality) => {
            unlockAllAudio();
            sound.playMenuSwitch();
            setGameSettings((gs) => ({ ...gs, quality: q }));
          }}
          onConfirmEnter={confirmWelcome}
        />
      )}

      {setupCompleted && screen === 'PLAYING' && hud && !inventoryOpen && !skillPrompt && (
        <GameHUD hud={hud} lang={lang} settings={gameSettings} measuredFps={measuredFps} />
      )}

      {setupCompleted && screen === 'PLAYING' && inventoryOpen && hud && (
        <InventoryModal
          hud={hud}
          lang={lang}
          controllerType={gameSettings.controllerType}
          callsign={deepSettings.callsign}
          activeTab={inventoryTab}
          focusedSkillIdx={focusedSkillIdx}
          focusedArtifactIdx={focusedArtifactIdx}
          onChangeTab={(tab) => {
            sound.playMenuSwitch();
            setInventoryTab(tab);
          }}
          onFocusSkill={setFocusedSkillIdx}
          onFocusArtifact={setFocusedArtifactIdx}
          onAssignSkill={handleAssignSkill}
          onClose={() => {
            sound.playMenuSwitch();
            setInventoryOpen(false);
          }}
        />
      )}

      {setupCompleted && screen === 'PLAYING' && skillPrompt && (
        <SkillPreviewModal
          skillId={skillPrompt.skillId}
          lang={lang}
          controllerType={gameSettings.controllerType}
          mode={skillPrompt.mode}
          selectedChoice={skillPrompt.choice}
          onSelectChoice={(idx) => {
            sound.playMenuSwitch();
            setSkillPrompt((prev) => (prev ? { ...prev, choice: idx } : null));
          }}
          onYes={() => {
            sound.playMenuConfirm();
            setSkillPrompt((prev) => (prev ? { ...prev, mode: 'SHOW' } : null));
          }}
          onNo={() => {
            sound.playMenuSwitch();
            setSkillPrompt(null);
          }}
        />
      )}

      {setupCompleted && screen !== 'PLAYING' && hud && (
        <GrittyMenu
          screen={screen}
          subView={subView}
          lang={lang}
          controllerType={gameSettings.controllerType}
          selectedIndex={Math.min(selectedIndex, menuButtons.length - 1)}
          onSelectIndex={handleSelectIndex}
          onColsChange={handleColsChange}
          buttons={menuButtons}
          deepSettings={deepSettings}
          benchTargetFps={benchTargetFps}
          benchFocusRow={benchFocusRow}
          benchConfirmSignal={benchConfirmSignal}
          onBenchFocusRow={setBenchFocusRow}
          onBenchHasResultChange={(hasRes) => {
            benchHasResultRef.current = hasRes;
          }}
          onChangeBenchTargetFps={setBenchTargetFps}
          onApplyBenchPreset={(q, fpsLimit) => {
            sound.playMenuConfirm();
            setGameSettings((gs) => ({ ...gs, quality: q, fpsLimit }));
          }}
          trailerRestartSignal={trailerRestartSignal}
          stats={{
            floor: hud.floor,
            kills: hud.kills,
            parries: hud.parries,
            timeSurvived: hud.timeSurvived,
            artifacts: hud.artifacts,
          }}
          onCloseControls={closeSubView}
        />
      )}
    </main>
  );
}
