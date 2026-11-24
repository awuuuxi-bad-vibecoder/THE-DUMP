import { ARTIFACTS, computeDerivedStats, createEmptyArtifacts, pickRandomArtifact } from './artifacts';
import { sound } from './audio';
import { GamepadManager } from './gamepad';
import { I18N, Lang, loadSavedLang } from './i18n';
import { generateFloor } from './mapGen';
import { ALL_SKILL_IDS, SKILLS } from './skills';
import {
  drawBasementTile,
  drawCrate,
  drawEnemy,
  drawHatch,
  drawLootDrop,
  drawPlayer,
  drawProjectileSpark,
} from './sprites';
import {
  AfterImage,
  ArtifactId,
  CrateEntity,
  Decal,
  DeepSettings,
  EnemyEntity,
  FloatingText,
  FloorMap,
  GameSettings,
  HUDState,
  InputSnapshot,
  InteractPrompt,
  LootDrop,
  Particle,
  PlayerEntity,
  ProjectileSpark,
  ShockwaveRing,
  SkillId,
  SlashArc,
  SpeedLine,
} from './types';
import { DEFAULT_DEEP_SETTINGS, DEFAULT_GAME_SETTINGS } from './settingsStorage';

export const LOGICAL_W = 480;
export const LOGICAL_H = 270;

const STORAGE_BEST_FLOOR = 'the_dump_best_floor_v1';
const STORAGE_BEST_TIME = 'the_dump_best_time_v1';

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function normAngle(a: number) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function swapRemove<T>(arr: T[], idx: number) {
  const last = arr.length - 1;
  if (idx !== last) arr[idx] = arr[last];
  arr.pop();
}

const BFS_DX = [1, -1, 0, 0];
const BFS_DY = [0, 0, 1, -1];

export class GameEngine {
  private map!: FloorMap;
  private player!: PlayerEntity;
  private enemies: EnemyEntity[] = [];
  private crates: CrateEntity[] = [];
  private drops: LootDrop[] = [];
  private slashes: SlashArc[] = [];
  private shockwaves: ShockwaveRing[] = [];
  private speedLines: SpeedLine[] = [];
  private projectiles: ProjectileSpark[] = [];
  private particles: Particle[] = [];
  private decals: Decal[] = [];
  private floatingTexts: FloatingText[] = [];
  private afterImages: AfterImage[] = [];

  private enemyLastPos = new Map<string, { x: number; y: number; stuckTimer: number }>();
  private enemyEngaged = new Set<string>();

  private floor = 1;
  private kills = 0;
  private parries = 0;
  private timeSurvived = 0;
  private totalEnemiesOnFloor = 0;
  private bestFloor = 1;
  private bestTime = 0;

  private camX = 0;
  private camY = 0;
  private shakeMag = 0;
  private hitStopTimer = 0;
  private globalFlash = 0;
  private globalFlashColor = '#b8f4ff';
  private elapsed = 0;
  private combatTimer = 0;
  private puddleStepTimer = 0;

  // Pre-allocated BFS flow-field buffers for enemy obstacle navigation (zero per-call alloc)
  private distField: Int16Array = new Int16Array(64 * 48);
  private bfsQueueX: Int16Array = new Int16Array(64 * 48);
  private bfsQueueY: Int16Array = new Int16Array(64 * 48);
  private lastFlowPlayerTx = -1;
  private lastFlowPlayerTy = -1;
  private flowTimer = 0;

  private cachedStats!: ReturnType<typeof computeDerivedStats>;
  private afterImageScratch!: PlayerEntity;
  private renderActors: Array<{ y: number; draw: () => void }> = [];

  private toast: { title: string; subtitle: string; color: string; timer: number } | null = null;
  private currentInteract: InteractPrompt | null = null;
  public pendingSkillBookPrompt: SkillId | null = null;

  // Performance: pre-baked static tile cache + pre-rendered radial glow sprites
  private mapCacheCanvas: HTMLCanvasElement;
  private mapCacheCtx: CanvasRenderingContext2D;
  private mapCacheNoTextures = false;

  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private additiveCanvas: HTMLCanvasElement;
  private additiveCtx: CanvasRenderingContext2D;
  private maskGlowSprite: HTMLCanvasElement;
  private colorGlowCache = new Map<string, HTMLCanvasElement>();

  private settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };

  private deepSettings: DeepSettings = { ...DEFAULT_DEEP_SETTINGS };

  private gamepad: GamepadManager;
  private lang: Lang = loadSavedLang();

  constructor(gamepad: GamepadManager) {
    this.gamepad = gamepad;

    this.mapCacheCanvas = document.createElement('canvas');
    this.mapCacheCtx = this.mapCacheCanvas.getContext('2d')!;
    this.mapCacheCtx.imageSmoothingEnabled = false;

    this.lightCanvas = document.createElement('canvas');
    this.lightCanvas.width = LOGICAL_W;
    this.lightCanvas.height = LOGICAL_H;
    this.lightCtx = this.lightCanvas.getContext('2d')!;
    this.lightCtx.imageSmoothingEnabled = false;

    this.additiveCanvas = document.createElement('canvas');
    this.additiveCanvas.width = LOGICAL_W;
    this.additiveCanvas.height = LOGICAL_H;
    this.additiveCtx = this.additiveCanvas.getContext('2d')!;
    this.additiveCtx.imageSmoothingEnabled = false;

    this.maskGlowSprite = this.createRadialSprite('#ffffff', 128);

    this.loadRecords();
    this.startNewRun();
  }

  private createRadialSprite(hexColor: string, size: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const gctx = c.getContext('2d')!;
    const half = size / 2;
    const grad = gctx.createRadialGradient(half, half, 1, half, half, half);
    grad.addColorStop(0, hexColor);
    grad.addColorStop(0.5, hexColor + '66');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, size, size);
    return c;
  }

  private getColorGlowSprite(hexColor: string): HTMLCanvasElement {
    let sp = this.colorGlowCache.get(hexColor);
    if (!sp) {
      const clean = /^#[0-9a-fA-F]{6}$/.test(hexColor) ? hexColor : '#ffaa44';
      sp = this.createRadialSprite(clean, 96);
      this.colorGlowCache.set(hexColor, sp);
    }
    return sp;
  }

  public setLang(lang: Lang) {
    this.lang = lang;
  }

  public setGameSettings(gs: GameSettings) {
    this.settings = { ...gs };
  }

  public setDeepSettings(ds: DeepSettings) {
    const texChanged = ds.noTextures !== this.deepSettings.noTextures;
    this.deepSettings = { ...ds };
    if (texChanged && this.map) {
      this.rebuildMapCache();
    }
  }

  public assignSkillSlot(slot: 'R1' | 'R2', skillId: SkillId) {
    if (!this.player.unlockedSkills.includes(skillId)) return;
    const def = SKILLS[skillId];
    if (slot === 'R2' || def.category === 'PRIMARY') {
      if (def.category === 'PRIMARY') {
        this.player.slotR2 = skillId;
      } else {
        this.player.slotR1 = skillId;
      }
    } else {
      if (def.category === 'SECONDARY') {
        this.player.slotR1 = skillId;
      } else {
        this.player.slotR2 = skillId;
      }
    }
  }

  private loadRecords() {
    try {
      this.bestFloor = Number(localStorage.getItem(STORAGE_BEST_FLOOR) || '1') || 1;
      this.bestTime = Number(localStorage.getItem(STORAGE_BEST_TIME) || '0') || 0;
    } catch {
      this.bestFloor = 1;
      this.bestTime = 0;
    }
  }

  private saveRecords() {
    if (this.floor > this.bestFloor) this.bestFloor = this.floor;
    if (this.timeSurvived > this.bestTime) this.bestTime = this.timeSurvived;
    try {
      localStorage.setItem(STORAGE_BEST_FLOOR, String(this.bestFloor));
      localStorage.setItem(STORAGE_BEST_TIME, String(Math.floor(this.bestTime)));
    } catch {
      // ignore
    }
  }

  public startNewRun() {
    this.floor = 1;
    this.kills = 0;
    this.parries = 0;
    this.timeSurvived = 0;
    this.combatTimer = 0;
    this.pendingSkillBookPrompt = null;

    const artifacts = createEmptyArtifacts();
    const stats = computeDerivedStats(artifacts);
    this.cachedStats = stats;

    this.player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 6,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      stamina: 100,
      maxStamina: 100,
      aimAngle: 0,
      walkPhase: 0,
      attackTimer: 0,
      r1Cooldown: 0,
      r2Cooldown: 0,
      attackCombo: 0,
      attackAngle: 0,
      swingDir: 1,
      activeSkillAnim: null,
      unlockedSkills: ['chain_cleave'],
      slotR2: 'chain_cleave',
      slotR1: null,
      parryTimer: 0,
      parryCooldown: 0,
      parrySuccessFlash: 0,
      dashTimer: 0,
      dashCooldown: 0,
      dashDirX: 1,
      dashDirY: 0,
      invulnTimer: 0,
      hitFlash: 0,
      lampFuel: 100,
      lampFlicker: 1,
      adrenalineTimer: 0,
      artifacts,
    };
    this.afterImageScratch = { ...this.player, hitFlash: 0 };

    this.loadFloor(1);
    const t = I18N[this.lang];
    this.showToast(t.toastFloor1Title, t.toastFloor1Sub, '#e5a243');
  }

  private loadFloor(floorNum: number) {
    this.floor = floorNum;
    const gen = generateFloor(floorNum, this.settings.difficulty);
    this.map = gen.map;
    this.crates = gen.crates;
    this.enemies = gen.enemies;
    this.totalEnemiesOnFloor = this.enemies.length;
    this.drops = [];
    this.slashes = [];
    this.shockwaves = [];
    this.speedLines = [];
    this.projectiles = [];
    this.particles = [];
    this.decals = [];
    this.floatingTexts = [];
    this.afterImages = [];
    this.enemyLastPos.clear();
    this.enemyEngaged.clear();
    this.combatTimer = 0;

    // Guarantee no enemy begins overlapping a wall or boiler tile
    for (const e of this.enemies) {
      if (!this.canEntityOccupy(e.x, e.y, e.radius)) {
        const safe = this.findNearestSafeTileCenter(e.x, e.y, e.radius);
        e.x = safe.x;
        e.y = safe.y;
      }
      if (e.isBoss) {
        this.enemyEngaged.add(e.id);
      }
    }

    this.player.x = this.map.spawn.x;
    this.player.y = this.map.spawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.camX = this.player.x - LOGICAL_W / 2;
    this.camY = this.player.y - LOGICAL_H / 2;
    this.lastFlowPlayerTx = -1;
    this.lastFlowPlayerTy = -1;

    this.rebuildMapCache();
    this.rebuildDistanceField();

    if (floorNum === 1) {
      const storage = this.map.rooms.find((r) => r.kind === 'STORAGE');
      if (storage) {
        this.drops.push({
          id: 'starter_artifact',
          x: (storage.x + storage.w / 2) * this.map.tileSize,
          y: (storage.y + storage.h / 2 + 2) * this.map.tileSize,
          vx: 0,
          vy: 0,
          kind: 'ARTIFACT',
          artifactId: 'blood_fang',
          bobPhase: 0,
        });
      }
      const alcoveSW = this.map.rooms.find((r) => r.id === 'alcove_sw');
      if (alcoveSW) {
        this.drops.push({
          id: 'skill_book_1',
          x: (alcoveSW.x + alcoveSW.w / 2) * this.map.tileSize,
          y: (alcoveSW.y + alcoveSW.h / 2) * this.map.tileSize,
          vx: 0,
          vy: 0,
          kind: 'SKILL_BOOK',
          skillId: 'whirlwind_rend',
          bobPhase: 1.2,
        });
      }
      const alcoveNE = this.map.rooms.find((r) => r.id === 'alcove_ne');
      if (alcoveNE) {
        this.drops.push({
          id: 'skill_book_2',
          x: (alcoveNE.x + alcoveNE.w / 2) * this.map.tileSize,
          y: (alcoveNE.y + alcoveNE.h / 2 + 1) * this.map.tileSize,
          vx: 0,
          vy: 0,
          kind: 'SKILL_BOOK',
          skillId: 'heavy_breaker',
          bobPhase: 2.4,
        });
      }
    } else if (floorNum === 2) {
      const alcoveNW = this.map.rooms.find((r) => r.id === 'alcove_nw');
      if (alcoveNW && !this.player.unlockedSkills.includes('spark_nova_slash')) {
        this.drops.push({
          id: 'skill_book_3',
          x: (alcoveNW.x + alcoveNW.w / 2) * this.map.tileSize,
          y: (alcoveNW.y + alcoveNW.h / 2) * this.map.tileSize,
          vx: 0,
          vy: 0,
          kind: 'SKILL_BOOK',
          skillId: 'spark_nova_slash',
          bobPhase: 0.7,
        });
      }
    }
  }

  private rebuildMapCache() {
    const wPx = this.map.width * this.map.tileSize;
    const hPx = this.map.height * this.map.tileSize;
    this.mapCacheCanvas.width = wPx;
    this.mapCacheCanvas.height = hPx;
    this.mapCacheNoTextures = this.deepSettings.noTextures;
    this.mapCacheCtx.imageSmoothingEnabled = false;
    for (let ty = 0; ty < this.map.height; ty++) {
      for (let tx = 0; tx < this.map.width; tx++) {
        drawBasementTile(this.mapCacheCtx, this.map, tx, ty, 0, this.mapCacheNoTextures);
      }
    }
  }

  private isWalkableTile(tx: number, ty: number): boolean {
    if (ty < 0 || ty >= this.map.height || tx < 0 || tx >= this.map.width) return false;
    const t = this.map.tiles[ty][tx];
    return t !== 0 && t !== 4;
  }

  // BFS shortest-path distance field from player's tile for obstacle avoidance (zero-alloc)
  private rebuildDistanceField() {
    const w = this.map.width;
    const h = this.map.height;
    const total = w * h;
    if (this.distField.length !== total) {
      this.distField = new Int16Array(total);
      this.bfsQueueX = new Int16Array(total);
      this.bfsQueueY = new Int16Array(total);
    }
    this.distField.fill(30000);

    const ptx = clamp(Math.floor(this.player.x / this.map.tileSize), 1, w - 2);
    const pty = clamp(Math.floor(this.player.y / this.map.tileSize), 1, h - 2);
    this.lastFlowPlayerTx = ptx;
    this.lastFlowPlayerTy = pty;

    if (!this.isWalkableTile(ptx, pty)) return;

    const queueX = this.bfsQueueX;
    const queueY = this.bfsQueueY;
    let head = 0;
    let tail = 0;

    this.distField[pty * w + ptx] = 0;
    queueX[tail] = ptx;
    queueY[tail] = pty;
    tail++;

    while (head < tail) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;
      const nextDist = this.distField[cy * w + cx] + 1;

      for (let i = 0; i < 4; i++) {
        const nx = cx + BFS_DX[i];
        const ny = cy + BFS_DY[i];
        if (!this.isWalkableTile(nx, ny)) continue;
        const idx = ny * w + nx;
        if (this.distField[idx] > nextDist) {
          this.distField[idx] = nextDist;
          queueX[tail] = nx;
          queueY[tail] = ny;
          tail++;
        }
      }
    }
  }

  private hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 6);
    if (steps <= 1) return true;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = x0 + dx * t;
      const sy = y0 + dy * t;
      if (this.isSolidAt(sx, sy)) return false;
      // Margin check for corners
      if (this.isSolidAt(sx + 4, sy) && this.isSolidAt(sx - 4, sy)) return false;
      if (this.isSolidAt(sx, sy + 4) && this.isSolidAt(sx, sy - 4)) return false;
    }
    return true;
  }

  private getChaseSteerAngle(ex: number, ey: number): number {
    const p = this.player;
    if (this.hasLineOfSight(ex, ey, p.x, p.y)) {
      return Math.atan2(p.y - ey, p.x - ex);
    }

    const ts = this.map.tileSize;
    const w = this.map.width;
    const etx = clamp(Math.floor(ex / ts), 1, w - 2);
    const ety = clamp(Math.floor(ey / ts), 1, this.map.height - 2);

    let bestScore = this.distField[ety * w + etx];
    let bestTx = etx;
    let bestTy = ety;

    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        const nx = etx + ox;
        const ny = ety + oy;
        if (!this.isWalkableTile(nx, ny)) continue;
        // Prevent diagonal corner cutting through walls or machinery
        if (ox !== 0 && oy !== 0) {
          if (!this.isWalkableTile(etx + ox, ety) || !this.isWalkableTile(etx, ety + oy)) continue;
        }
        const d = this.distField[ny * w + nx];
        if (d < bestScore) {
          bestScore = d;
          bestTx = nx;
          bestTy = ny;
        }
      }
    }

    if (bestTx === etx && bestTy === ety) {
      return Math.atan2(p.y - ey, p.x - ex);
    }
    const targetX = (bestTx + 0.5) * ts;
    const targetY = (bestTy + 0.5) * ts;
    return Math.atan2(targetY - ey, targetX - ex);
  }

  private showToast(title: string, subtitle: string, color: string) {
    this.toast = { title, subtitle, color, timer: 3.4 };
  }

  public isGameOver(): boolean {
    return this.player.hp <= 0;
  }

  public update(dt: number, input: InputSnapshot) {
    const clampedDt = Math.min(0.05, dt);
    this.elapsed += clampedDt;

    if (this.toast) {
      this.toast.timer -= clampedDt;
      if (this.toast.timer <= 0) this.toast = null;
    }

    if (this.globalFlash > 0) {
      this.globalFlash = Math.max(0, this.globalFlash - clampedDt * 5.5);
    }

    if (this.shakeMag > 0) {
      this.shakeMag = Math.max(0, this.shakeMag - clampedDt * 24);
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= clampedDt;
      this.updateParticlesOnly(clampedDt * 0.25);
      return;
    }

    this.timeSurvived += clampedDt;
    this.combatTimer = Math.max(0, this.combatTimer - clampedDt);

    // Update pathfinding distance field when player crosses into a new tile
    this.flowTimer -= clampedDt;
    const curPtx = Math.floor(this.player.x / this.map.tileSize);
    const curPty = Math.floor(this.player.y / this.map.tileSize);
    if (this.flowTimer <= 0 || curPtx !== this.lastFlowPlayerTx || curPty !== this.lastFlowPlayerTy) {
      this.flowTimer = 0.16;
      this.rebuildDistanceField();
    }

    const stats = this.cachedStats;
    this.player.maxHp = stats.maxHp;

    this.updatePlayer(clampedDt, input, stats);
    this.updateEnemies(clampedDt, stats);
    this.updateProjectiles(clampedDt, stats);
    this.updateDropsAndInteract(clampedDt, input, stats);
    this.updateEffects(clampedDt);

    // Combat OST only triggers when enemy/enemies are actively attacking or engaging the player!
    let anyEnemyAttacking = false;
    const px = this.player.x;
    const py = this.player.y;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dx = e.x - px;
      const dy = e.y - py;
      const distSq = dx * dx + dy * dy;
      if (e.state === 'WINDUP' || e.state === 'ATTACK') {
        if (distSq < 90000) {
          anyEnemyAttacking = true;
          break;
        }
      } else if (this.enemyEngaged.has(e.id) && (e.state === 'CHASE' || e.state === 'CIRCLE')) {
        if (distSq < 60025) {
          anyEnemyAttacking = true;
          break;
        }
      }
    }
    if (anyEnemyAttacking) {
      this.combatTimer = Math.max(this.combatTimer, 1.8);
    }

    if (!this.map.hatchUnlocked && this.enemies.length === 0) {
      this.map.hatchUnlocked = true;
      sound.playHatchUnlock();
      this.gamepad.rumble(0.4, 0.2, 180);
      const t = I18N[this.lang];
      this.showToast(t.toastHatchTitle, t.toastHatchSub, '#ffb347');
    }

    const speedMag = Math.hypot(this.player.vx, this.player.vy);
    const swayAmt = clamp(speedMag / 100, 0, 1) * 1.8;
    const swayX = Math.cos(this.player.walkPhase * 0.5) * swayAmt;
    const swayY = Math.abs(Math.sin(this.player.walkPhase)) * swayAmt * 0.7;

    const leadX = Math.cos(this.player.aimAngle) * 18;
    const leadY = Math.sin(this.player.aimAngle) * 14;
    const targetCamX = this.player.x + leadX + swayX - LOGICAL_W / 2;
    const targetCamY = this.player.y + leadY + swayY - LOGICAL_H / 2;
    this.camX += (targetCamX - this.camX) * Math.min(1, clampedDt * 8.5);
    this.camY += (targetCamY - this.camY) * Math.min(1, clampedDt * 8.5);

    const moteChance = this.settings.quality === 'low' ? 0.1 : this.settings.quality === 'medium' ? 0.18 : 0.28;
    const maxParticles = this.settings.quality === 'low' ? 65 : this.settings.quality === 'medium' ? 115 : 190;
    if (this.particles.length < maxParticles && Math.random() < moteChance) {
      this.particles.push({
        x: this.player.x + (Math.random() - 0.5) * 200,
        y: this.player.y + (Math.random() - 0.5) * 140,
        vx: (Math.random() - 0.5) * 8,
        vy: -4 - Math.random() * 6,
        size: 1,
        color: '#8f8574',
        life: 1.4 + Math.random() * 1.4,
        maxLife: 2.8,
        lightRadius: 0,
        lightColor: '#000000',
      });
    }
  }

  private triggerHitStop(sec: number) {
    if (this.settings.hitStopEnabled) {
      this.hitStopTimer = Math.max(this.hitStopTimer, sec);
    }
  }

  private triggerShake(mag: number) {
    if (this.settings.shakeScale <= 0) return;
    this.shakeMag = Math.max(this.shakeMag, mag * this.settings.shakeScale);
  }

  private spawnShockwave(x: number, y: number, maxRadius: number, color: string, maxLife = 0.28) {
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius,
      life: maxLife,
      maxLife,
      color,
    });
  }

  private spawnSpeedLines(x: number, y: number, angle: number, count: number, color: string, spread = 0.55) {
    const cap = this.settings.quality === 'low' ? Math.ceil(count * 0.5) : count;
    for (let i = 0; i < cap; i++) {
      const a = angle + (Math.random() - 0.5) * spread * 2;
      this.speedLines.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        angle: a,
        len: 7 + Math.random() * 11,
        spd: 140 + Math.random() * 130,
        color,
        life: 0.14 + Math.random() * 0.1,
        maxLife: 0.24,
      });
    }
  }

  private updatePlayer(dt: number, input: InputSnapshot, stats: ReturnType<typeof computeDerivedStats>) {
    const p = this.player;

    p.r1Cooldown = Math.max(0, p.r1Cooldown - dt);
    p.r2Cooldown = Math.max(0, p.r2Cooldown - dt);
    p.attackTimer = Math.max(0, p.attackTimer - dt);
    p.parryTimer = Math.max(0, p.parryTimer - dt);
    p.parryCooldown = Math.max(0, p.parryCooldown - dt);
    p.parrySuccessFlash = Math.max(0, p.parrySuccessFlash - dt);
    p.dashTimer = Math.max(0, p.dashTimer - dt);
    p.dashCooldown = Math.max(0, p.dashCooldown - dt);
    p.invulnTimer = Math.max(0, p.invulnTimer - dt);
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    p.adrenalineTimer = Math.max(0, p.adrenalineTimer - dt);

    p.stamina = Math.min(p.maxStamina, p.stamina + dt * 36);
    p.lampFuel = Math.max(35, p.lampFuel - dt * 0.4);
    p.lampFlicker = 0.94 + Math.sin(this.elapsed * 16) * 0.03 + Math.sin(this.elapsed * 37) * 0.03;

    if (input.hasAimInput) {
      p.aimAngle = Math.atan2(input.aimY, input.aimX);
    } else if (Math.hypot(input.moveX, input.moveY) > 0.25 && p.attackTimer <= 0) {
      const target = Math.atan2(input.moveY, input.moveX);
      const diff = normAngle(target - p.aimAngle);
      p.aimAngle += diff * Math.min(1, dt * 12);
    }

    // Dash (✕)
    if (input.dashPressed && p.dashCooldown <= 0 && p.stamina >= 22) {
      p.stamina -= 22;
      p.dashTimer = 0.14;
      p.dashCooldown = 0.35;
      p.invulnTimer = 0.19;
      p.parryTimer = 0;

      const hasMove = Math.hypot(input.moveX, input.moveY) > 0.15;
      const dirAngle = hasMove ? Math.atan2(input.moveY, input.moveX) : p.aimAngle;
      p.dashDirX = Math.cos(dirAngle);
      p.dashDirY = Math.sin(dirAngle);

      sound.playDash();
      this.gamepad.rumble(0.15, 0.25, 70);
      this.spawnSpeedLines(p.x, p.y, dirAngle + Math.PI, 6, '#70d4ff', 0.4);
      for (let i = 0; i < 6; i++) {
        this.particles.push({
          x: p.x,
          y: p.y + 3,
          vx: -p.dashDirX * (30 + Math.random() * 40) + (Math.random() - 0.5) * 30,
          vy: -p.dashDirY * (30 + Math.random() * 40) + (Math.random() - 0.5) * 30,
          size: 2,
          color: '#6e6a63',
          life: 0.28,
          maxLife: 0.28,
          lightRadius: 0,
          lightColor: '#000',
        });
      }

      // Static Boots artifact discharge!
      if (stats.dashShockDmg > 0) {
        this.slashes.push({
          x: p.x,
          y: p.y,
          angle: 0,
          arcWidth: Math.PI * 2,
          radius: 34,
          life: 0.16,
          maxLife: 0.16,
          color: '#66d9ff',
          isEnemy: false,
          isFullCircle: true,
        });
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          const d = Math.hypot(e.x - p.x, e.y - p.y);
          if (d < 40) {
            this.damageEnemy(e, stats.dashShockDmg, Math.atan2(e.y - p.y, e.x - p.x), false, false, stats);
          }
        }
      }
    }

    // Parry (L1 / ◯)
    if (input.parryPressed && p.parryCooldown <= 0 && p.dashTimer <= 0) {
      p.parryTimer = 0.25;
      p.parryCooldown = 0.5;
      p.attackTimer = 0;
      sound.playParryAttempt();
      this.particles.push({
        x: p.x + Math.cos(p.aimAngle) * 8,
        y: p.y + Math.sin(p.aimAngle) * 8,
        vx: 0,
        vy: 0,
        size: 2,
        color: '#8ef0ff',
        life: 0.16,
        maxLife: 0.16,
        lightRadius: 26,
        lightColor: '#66d9ff',
      });
    }

    // PRIMARY ATTACK ON R2
    if (input.attackR2Pressed && p.r2Cooldown <= 0 && p.dashTimer <= 0) {
      const def = SKILLS[p.slotR2];
      if (p.stamina >= def.staminaCost) {
        p.stamina -= def.staminaCost;
        const cd = this.executeSkill(p.slotR2, stats);
        p.r2Cooldown = cd * (1 - stats.cooldownReduction);
      }
    }

    // SECONDARY SKILL ON R1
    if (input.attackR1Pressed && p.slotR1 && p.r1Cooldown <= 0 && p.dashTimer <= 0) {
      const def = SKILLS[p.slotR1];
      if (p.stamina >= def.staminaCost) {
        p.stamina -= def.staminaCost;
        const cd = this.executeSkill(p.slotR1, stats);
        p.r1Cooldown = cd * (1 - stats.cooldownReduction);
      }
    }

    // Movement integration
    if (p.dashTimer > 0) {
      const dashSpeed = 305 * stats.dashDistMult;
      p.vx = p.dashDirX * dashSpeed;
      p.vy = p.dashDirY * dashSpeed;
      this.afterImages.push({
        x: p.x,
        y: p.y,
        angle: p.aimAngle,
        life: 0.14,
        maxLife: 0.14,
        color: '#5ec8ff',
      });
    } else {
      const moveSpeed = 106 * (p.adrenalineTimer > 0 ? 1.22 : 1) * (p.parryTimer > 0 ? 0.55 : 1);
      const targetVx = input.moveX * moveSpeed;
      const targetVy = input.moveY * moveSpeed;
      p.vx += (targetVx - p.vx) * Math.min(1, dt * 18);
      p.vy += (targetVy - p.vy) * Math.min(1, dt * 18);

      if (Math.hypot(p.vx, p.vy) > 14) {
        p.walkPhase += dt * 14;
        const tx = Math.floor(p.x / this.map.tileSize);
        const ty = Math.floor(p.y / this.map.tileSize);
        if (this.map.tiles[ty]?.[tx] === 3) {
          this.puddleStepTimer -= dt;
          if (this.puddleStepTimer <= 0) {
            this.puddleStepTimer = 0.15;
            for (let s = 0; s < 3; s++) {
              const a = Math.random() * Math.PI * 2;
              this.particles.push({
                x: p.x,
                y: p.y + 4,
                vx: Math.cos(a) * 26,
                vy: Math.sin(a) * 20,
                size: 1,
                color: '#527894',
                life: 0.22,
                maxLife: 0.22,
                lightRadius: 0,
                lightColor: '#000',
              });
            }
          }
        }
      }
    }

    this.moveCircleWithCollisions(p, p.vx * dt, p.vy * dt);
  }

  private executeSkill(skillId: SkillId, stats: ReturnType<typeof computeDerivedStats>): number {
    const p = this.player;
    p.parryTimer = 0;
    p.activeSkillAnim = skillId;

    switch (skillId) {
      case 'chain_cleave':
        return this.performChainCleave(stats);
      case 'heavy_breaker':
        return this.performHeavyBreaker(stats);
      case 'twin_fangs':
        return this.performTwinFangs(stats);
      case 'whirlwind_rend':
        return this.performWhirlwindRend(stats);
      case 'phantom_thrust':
        return this.performPhantomThrust(stats);
      case 'spark_nova_slash':
        return this.performSparkNovaSlash(stats);
    }
  }

  private getDynamicDmgMult(stats: ReturnType<typeof computeDerivedStats>): number {
    const lowHpBonus =
      this.player.hp / Math.max(1, this.player.maxHp) < 0.45 ? stats.lowHpDamageBonus : 0;
    return stats.damageMult + lowHpBonus;
  }

  private performChainCleave(stats: ReturnType<typeof computeDerivedStats>): number {
    const p = this.player;
    p.attackCombo = (p.attackCombo + 1) % 3;
    const isHeavy = p.attackCombo === 2;

    const cd = (isHeavy ? 0.34 : 0.22) / stats.attackSpeedMult;
    p.attackTimer = 0.14;
    p.attackAngle = p.aimAngle;
    p.swingDir = p.attackCombo === 1 ? -1 : 1;

    const lunge = isHeavy ? 145 : 90;
    p.vx += Math.cos(p.aimAngle) * lunge;
    p.vy += Math.sin(p.aimAngle) * lunge;

    sound.playSlash(p.attackCombo);

    const reach = isHeavy ? 36 : 31;
    const arcHalf = isHeavy ? 1.05 : 1.25;
    const slashColor = isHeavy ? '#ffb347' : '#ffdf9e';

    this.slashes.push({
      x: p.x,
      y: p.y,
      angle: p.aimAngle,
      arcWidth: arcHalf * 2,
      radius: reach,
      life: 0.13,
      maxLife: 0.13,
      color: slashColor,
      isEnemy: false,
    });
    if (isHeavy) {
      this.spawnShockwave(p.x + Math.cos(p.aimAngle) * 14, p.y + Math.sin(p.aimAngle) * 14, 34, '#ffb347', 0.22);
      this.spawnSpeedLines(p.x, p.y, p.aimAngle, 6, '#ffe094', 0.5);
    }

    const sparkCount = this.settings.quality === 'low' ? 4 : isHeavy ? 12 : 7;
    for (let i = 0; i < sparkCount; i++) {
      const a = p.aimAngle + (Math.random() - 0.5) * arcHalf * 1.6;
      const spd = 45 + Math.random() * 80;
      this.particles.push({
        x: p.x + Math.cos(a) * (reach * 0.55),
        y: p.y + Math.sin(a) * (reach * 0.55),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: isHeavy ? 2 : 1,
        color: isHeavy ? '#ff8e3c' : '#ffd27d',
        life: 0.24 + Math.random() * 0.12,
        maxLife: 0.36,
        lightRadius: isHeavy ? 28 : 18,
        lightColor: '#ff9633',
      });
    }

    const dmgMult = this.getDynamicDmgMult(stats);
    let hitAny = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + e.radius) {
        const angDiff = Math.abs(normAngle(Math.atan2(dy, dx) - p.aimAngle));
        if (angDiff <= arcHalf + 0.22 || dist < 14) {
          hitAny = true;
          let dmg = (isHeavy ? 40 : 24) * dmgMult;
          const isCrit = e.state === 'STAGGERED';
          if (isCrit) {
            dmg *= stats.riposteMult;
            e.state = 'RECOVER';
            e.stateTimer = 0.35;
          }
          if (stats.lampConeDmgBonus > 0 && dist <= 96) {
            dmg *= 1 + stats.lampConeDmgBonus;
          }
          this.damageEnemy(e, Math.round(dmg), Math.atan2(dy, dx), isHeavy || isCrit, isCrit, stats);
        }
      }
    }

    for (const c of this.crates) {
      if (c.broken) continue;
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      if (Math.hypot(dx, dy) <= reach + 8) {
        const angDiff = Math.abs(normAngle(Math.atan2(dy, dx) - p.aimAngle));
        if (angDiff <= arcHalf + 0.25) this.damageCrate(c, isHeavy ? 40 : 22);
      }
    }

    if (hitAny) {
      this.triggerHitStop(isHeavy ? 0.056 : 0.032);
      this.triggerShake(isHeavy ? 6.5 : 3.8);
      this.gamepad.rumble(isHeavy ? 0.55 : 0.3, 0.35, isHeavy ? 110 : 65);
    }

    return cd;
  }

  private performHeavyBreaker(stats: ReturnType<typeof computeDerivedStats>): number {
    const p = this.player;
    p.attackCombo = (p.attackCombo + 1) % 2;
    const isSlam = p.attackCombo === 1;
    const cd = (isSlam ? 0.48 : 0.36) / stats.attackSpeedMult;

    p.attackTimer = 0.2;
    p.attackAngle = p.aimAngle;
    p.swingDir = isSlam ? 1 : -1;

    p.vx += Math.cos(p.aimAngle) * (isSlam ? 155 : 105);
    p.vy += Math.sin(p.aimAngle) * (isSlam ? 155 : 105);

    sound.playSlash(2);

    const reach = isSlam ? 42 : 36;
    const arcHalf = 1.45;
    this.slashes.push({
      x: p.x,
      y: p.y,
      angle: p.aimAngle,
      arcWidth: arcHalf * 2,
      radius: reach,
      life: 0.17,
      maxLife: 0.17,
      color: isSlam ? '#ff6a2b' : '#ffa347',
      isEnemy: false,
    });
    if (isSlam) {
      const impactX = p.x + Math.cos(p.aimAngle) * 20;
      const impactY = p.y + Math.sin(p.aimAngle) * 20;
      this.spawnShockwave(impactX, impactY, 46, '#ff6a2b', 0.28);
      this.spawnShockwave(impactX, impactY, 26, '#ffd269', 0.2);
      this.spawnSpeedLines(impactX, impactY, p.aimAngle, 9, '#ff8e3c', 0.75);
    }

    const sparkCount = this.settings.quality === 'low' ? 6 : 16;
    for (let i = 0; i < sparkCount; i++) {
      const a = p.aimAngle + (Math.random() - 0.5) * arcHalf * 1.8;
      const spd = 65 + Math.random() * 95;
      this.particles.push({
        x: p.x + Math.cos(a) * (reach * 0.65),
        y: p.y + Math.sin(a) * (reach * 0.65),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2,
        color: i % 2 === 0 ? '#ff7b3b' : '#ffd269',
        life: 0.3 + Math.random() * 0.14,
        maxLife: 0.44,
        lightRadius: 28,
        lightColor: '#ff7722',
        bounce: true,
      });
    }

    const dmgMult = this.getDynamicDmgMult(stats);
    let hitAny = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + e.radius) {
        const angDiff = Math.abs(normAngle(Math.atan2(dy, dx) - p.aimAngle));
        if (angDiff <= arcHalf + 0.25 || dist < 15) {
          hitAny = true;
          let dmg = (isSlam ? 54 : 38) * dmgMult;
          const isCrit = e.state === 'STAGGERED';
          if (isCrit) {
            dmg *= stats.riposteMult;
            e.state = 'RECOVER';
            e.stateTimer = 0.35;
          } else if (isSlam && !e.isBoss) {
            e.state = 'STAGGERED';
            e.stateTimer = 0.45 * (1 + stats.staggerDurationBonus);
          }
          this.damageEnemy(e, Math.round(dmg), Math.atan2(dy, dx), true, isCrit, stats);
        }
      }
    }

    for (const c of this.crates) {
      if (!c.broken && Math.hypot(c.x - p.x, c.y - p.y) <= reach + 8) {
        this.damageCrate(c, 55);
      }
    }

    if (hitAny) {
      this.triggerHitStop(isSlam ? 0.068 : 0.045);
      this.triggerShake(isSlam ? 8.0 : 5.4);
      this.gamepad.rumble(0.75, 0.45, 130);
    }

    return cd;
  }

  private performTwinFangs(stats: ReturnType<typeof computeDerivedStats>): number {
    const p = this.player;
    p.attackCombo = (p.attackCombo + 1) % 2;
    const cd = 0.15 / stats.attackSpeedMult;

    p.attackTimer = 0.1;
    p.attackAngle = p.aimAngle;
    p.swingDir = p.attackCombo === 0 ? 1 : -1;

    p.vx += Math.cos(p.aimAngle) * 105;
    p.vy += Math.sin(p.aimAngle) * 105;

    sound.playSlash(p.attackCombo);

    const reach = 28;
    const arcHalf = 0.95;
    this.slashes.push({
      x: p.x,
      y: p.y,
      angle: p.aimAngle + p.swingDir * 0.12,
      arcWidth: arcHalf * 2,
      radius: reach,
      life: 0.1,
      maxLife: 0.1,
      color: '#ff527d',
      isEnemy: false,
    });
    this.slashes.push({
      x: p.x,
      y: p.y,
      angle: p.aimAngle - p.swingDir * 0.12,
      arcWidth: arcHalf * 1.4,
      radius: reach - 4,
      life: 0.09,
      maxLife: 0.09,
      color: '#ffd1dc',
      isEnemy: false,
    });

    const dmgMult = this.getDynamicDmgMult(stats);
    let hitAny = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + e.radius) {
        const angDiff = Math.abs(normAngle(Math.atan2(dy, dx) - p.aimAngle));
        if (angDiff <= arcHalf + 0.25 || dist < 14) {
          hitAny = true;
          let dmg = 18 * dmgMult;
          const isCrit = e.state === 'STAGGERED';
          if (isCrit) {
            dmg *= stats.riposteMult;
            e.state = 'RECOVER';
            e.stateTimer = 0.35;
          }
          // Twin Fangs inherently inflicts bleed!
          e.bleedTimer = Math.max(e.bleedTimer, 2.2);
          e.bleedDps = Math.max(e.bleedDps, 6);
          this.damageEnemy(e, Math.round(dmg), Math.atan2(dy, dx), false, isCrit, stats);
        }
      }
    }

    for (const c of this.crates) {
      if (!c.broken && Math.hypot(c.x - p.x, c.y - p.y) <= reach + 8) {
        this.damageCrate(c, 18);
      }
    }

    if (hitAny) {
      this.triggerHitStop(0.022);
      this.triggerShake(2.6);
      this.gamepad.rumble(0.25, 0.3, 45);
    }

    return cd;
  }

  private performWhirlwindRend(stats: ReturnType<typeof computeDerivedStats>): number {
    const p = this.player;
    p.attackTimer = 0.24;
    p.swingDir = 1;
    p.vx += Math.cos(p.aimAngle) * 120;
    p.vy += Math.sin(p.aimAngle) * 120;

    sound.playSlash(2);
    this.triggerShake(4.8);

    const reach = 44;
    this.slashes.push({
      x: p.x,
      y: p.y,
      angle: 0,
      arcWidth: Math.PI * 2,
      radius: reach,
      life: 0.2,
      maxLife: 0.2,
      color: '#ff9038',
      isEnemy: false,
      isFullCircle: true,
    });
    this.spawnShockwave(p.x, p.y, reach + 12, '#ff9038', 0.26);
    this.spawnSpeedLines(p.x, p.y, 0, 10, '#ffd27d', Math.PI);

    const sparkCount = this.settings.quality === 'low' ? 8 : 18;
    for (let i = 0; i < sparkCount; i++) {
      const a = (i / sparkCount) * Math.PI * 2;
      const spd = 85 + Math.random() * 65;
      this.particles.push({
        x: p.x + Math.cos(a) * 14,
        y: p.y + Math.sin(a) * 14,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2,
        color: i % 2 === 0 ? '#ffb347' : '#ff5e3a',
        life: 0.32,
        maxLife: 0.32,
        lightRadius: 24,
        lightColor: '#ff8822',
        bounce: true,
      });
    }

    const dmgMult = this.getDynamicDmgMult(stats);
    let hitAny = false;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = e.x - p.x;
      const dy = e.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= reach + e.radius) {
        hitAny = true;
        let dmg = 48 * dmgMult;
        const isCrit = e.state === 'STAGGERED';
        if (isCrit) {
          dmg *= stats.riposteMult;
          e.state = 'RECOVER';
          e.stateTimer = 0.35;
        }
        this.damageEnemy(e, Math.round(dmg), Math.atan2(dy, dx), true, isCrit, stats);
      }
    }

    for (const c of this.crates) {
      if (!c.broken && Math.hypot(c.x - p.x, c.y - p.y) <= reach + 8) {
        this.damageCrate(c, 45);
      }
    }

    if (hitAny) {
      this.triggerHitStop(0.06);
      this.triggerShake(6.5);
      this.gamepad.rumble(0.7, 0.5, 130);
    }

    return SKILLS.whirlwind_rend.cooldown / stats.attackSpeedMult;
  }

  private performPhantomThrust(stats: ReturnType<typeof computeDerivedStats>): number {
    const p = this.player;
    p.attackTimer = 0.22;
    p.invulnTimer = Math.max(p.invulnTimer, 0.18);

    const dirX = Math.cos(p.aimAngle);
    const dirY = Math.sin(p.aimAngle);
    const startX = p.x;
    const startY = p.y;

    sound.playSlash(2);
    sound.playDash();

    const steps = 10;
    const stepLen = 7.4;
    for (let s = 0; s < steps; s++) {
      this.moveCircleWithCollisions(p, dirX * stepLen, dirY * stepLen);
      if (s % 2 === 0) {
        this.afterImages.push({
          x: p.x,
          y: p.y,
          angle: p.aimAngle,
          life: 0.18,
          maxLife: 0.18,
          color: '#6ce2ff',
        });
      }
    }
    p.vx = dirX * 145;
    p.vy = dirY * 145;

    this.slashes.push({
      x: (startX + p.x) * 0.5,
      y: (startY + p.y) * 0.5,
      angle: p.aimAngle,
      arcWidth: 0.85,
      radius: 46,
      life: 0.18,
      maxLife: 0.18,
      color: '#7ceeff',
      isEnemy: false,
    });
    this.spawnShockwave(p.x, p.y, 38, '#7ceeff', 0.24);
    this.spawnSpeedLines(p.x, p.y, p.aimAngle + Math.PI, 12, '#9bf5ff', 0.32);

    const sparkCount = this.settings.quality === 'low' ? 6 : 16;
    for (let i = 0; i < sparkCount; i++) {
      const a = p.aimAngle + (Math.random() - 0.5) * 0.65;
      const spd = 70 + Math.random() * 110;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2,
        color: i % 2 === 0 ? '#9cf5ff' : '#ffffff',
        life: 0.3,
        maxLife: 0.3,
        lightRadius: 26,
        lightColor: '#66e0ff',
      });
    }

    const segDx = p.x - startX;
    const segDy = p.y - startY;
    const segLenSq = segDx * segDx + segDy * segDy || 1;
    const dmgMult = this.getDynamicDmgMult(stats);
    let hitAny = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const t = clamp(((e.x - startX) * segDx + (e.y - startY) * segDy) / segLenSq, 0, 1);
      const projX = startX + segDx * t;
      const projY = startY + segDy * t;
      const d = Math.hypot(e.x - projX, e.y - projY);
      if (d <= e.radius + 17) {
        hitAny = true;
        let dmg = 58 * dmgMult;
        const isCrit = e.state === 'STAGGERED';
        if (isCrit) {
          dmg *= stats.riposteMult;
        }
        if (!e.isBoss) {
          e.state = 'STAGGERED';
          e.stateTimer = 0.75 * (1 + stats.staggerDurationBonus);
        }
        this.damageEnemy(e, Math.round(dmg), p.aimAngle, true, isCrit, stats);
      }
    }

    for (const c of this.crates) {
      if (c.broken) continue;
      const t = clamp(((c.x - startX) * segDx + (c.y - startY) * segDy) / segLenSq, 0, 1);
      const d = Math.hypot(c.x - (startX + segDx * t), c.y - (startY + segDy * t));
      if (d <= 18) this.damageCrate(c, 50);
    }

    if (hitAny) {
      this.triggerHitStop(0.065);
      this.triggerShake(7.0);
      this.gamepad.rumble(0.75, 0.55, 140);
    }

    return SKILLS.phantom_thrust.cooldown / stats.attackSpeedMult;
  }

  private performSparkNovaSlash(stats: ReturnType<typeof computeDerivedStats>): number {
    const p = this.player;
    p.attackTimer = 0.2;
    p.attackAngle = p.aimAngle;
    p.swingDir = 1;
    p.vx -= Math.cos(p.aimAngle) * 55;
    p.vy -= Math.sin(p.aimAngle) * 55;

    sound.playSlash(2);
    this.triggerShake(4.2);

    this.slashes.push({
      x: p.x,
      y: p.y,
      angle: p.aimAngle,
      arcWidth: 1.5,
      radius: 32,
      life: 0.15,
      maxLife: 0.15,
      color: '#ffe05c',
      isEnemy: false,
    });

    // Fire 5 electrified blade sparks in a fan!
    const dmgMult = this.getDynamicDmgMult(stats);
    const dmgPerSpark = Math.round(28 * dmgMult);
    const fanAngles = [-0.42, -0.21, 0, 0.21, 0.42];
    for (const offset of fanAngles) {
      const a = p.aimAngle + offset;
      this.projectiles.push({
        x: p.x + Math.cos(a) * 10,
        y: p.y + Math.sin(a) * 10,
        vx: Math.cos(a) * 235,
        vy: Math.sin(a) * 235,
        dmg: dmgPerSpark,
        color: offset === 0 ? '#ffffff' : '#ffe05c',
        life: 0.65,
        radius: 5,
      });
    }

    this.gamepad.rumble(0.45, 0.4, 95);
    return SKILLS.spark_nova_slash.cooldown / stats.attackSpeedMult;
  }

  private updateProjectiles(dt: number, stats: ReturnType<typeof computeDerivedStats>) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const sp = this.projectiles[i];
      sp.life -= dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;

      if (sp.life <= 0 || this.isSolidAt(sp.x, sp.y)) {
        for (let k = 0; k < 4; k++) {
          const a = Math.random() * Math.PI * 2;
          this.particles.push({
            x: sp.x,
            y: sp.y,
            vx: Math.cos(a) * 55,
            vy: Math.sin(a) * 55,
            size: 1,
            color: sp.color,
            life: 0.2,
            maxLife: 0.2,
            lightRadius: 16,
            lightColor: '#ffe05c',
          });
        }
        swapRemove(this.projectiles, i);
        continue;
      }

      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dx = e.x - sp.x;
        const dy = e.y - sp.y;
        const r = e.radius + sp.radius;
        if (dx * dx + dy * dy <= r * r) {
          const isCrit = e.state === 'STAGGERED';
          const dmg = isCrit ? Math.round(sp.dmg * 1.45) : sp.dmg;
          this.damageEnemy(e, dmg, Math.atan2(sp.vy, sp.vx), false, isCrit, stats);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (let k = 0; k < this.crates.length; k++) {
          const c = this.crates[k];
          if (!c.broken) {
            const dx = c.x - sp.x;
            const dy = c.y - sp.y;
            if (dx * dx + dy * dy <= 100) {
              this.damageCrate(c, sp.dmg);
              hit = true;
              break;
            }
          }
        }
      }
      if (hit) {
        swapRemove(this.projectiles, i);
      }
    }
  }

  private damageEnemy(
    e: EnemyEntity,
    dmg: number,
    hitAngle: number,
    heavy: boolean,
    isCrit: boolean,
    stats: ReturnType<typeof computeDerivedStats>
  ) {
    e.hp -= dmg;
    e.hitFlash = 0.12;
    e.alerted = true;

    const kbMult = e.isBoss ? 0.32 : 1 + stats.staggerDurationBonus * 0.5;
    const kb = (heavy ? 135 : 72) * kbMult;
    e.vx += Math.cos(hitAngle) * kb;
    e.vy += Math.sin(hitAngle) * kb;

    if (stats.bleedPct > 0) {
      e.bleedTimer = 2.5;
      e.bleedDps = (dmg * stats.bleedPct) / 2.5;
    }

    const totalLifesteal =
      stats.lifestealPct +
      (this.player.hp / Math.max(1, this.player.maxHp) < 0.45 ? stats.lowHpLifestealBonus : 0);

    if (totalLifesteal > 0) {
      const heal = Math.max(1, Math.round(dmg * totalLifesteal));
      const actualHeal = Math.min(this.player.maxHp - this.player.hp, heal);
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
      if (actualHeal > 0) {
        this.floatingTexts.push({
          x: this.player.x + (Math.random() - 0.5) * 10,
          y: this.player.y - 12,
          vy: -18,
          text: `+${actualHeal}`,
          color: '#63e678',
          life: 0.75,
          maxLife: 0.75,
        });
      }
    }

    sound.playHit(heavy);

    if (heavy || isCrit) {
      this.spawnShockwave(e.x, e.y, isCrit ? 34 : 24, isCrit ? '#ffe066' : '#ff8c42', 0.2);
      this.spawnSpeedLines(e.x, e.y, hitAngle, isCrit ? 9 : 6, isCrit ? '#ffe066' : '#ffd269', 0.45);
    }

    this.floatingTexts.push({
      x: e.x + (Math.random() - 0.5) * 8,
      y: e.y - 11,
      vy: -24,
      text: isCrit ? `${dmg}!` : `${dmg}`,
      color: isCrit ? '#ffe066' : '#f2ede4',
      life: 0.6,
      maxLife: 0.6,
    });

    const count = this.settings.quality === 'low' ? (heavy ? 7 : 4) : heavy ? 18 : 10;
    for (let i = 0; i < count; i++) {
      const a = hitAngle + (Math.random() - 0.5) * 1.2;
      const spd = 50 + Math.random() * 130;
      const isSpark = i % 3 === 0;
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: isSpark ? 1 : 2,
        color: isSpark ? '#ffd269' : '#9e1c24',
        life: 0.25 + Math.random() * 0.25,
        maxLife: 0.5,
        lightRadius: isSpark ? 24 : 0,
        lightColor: '#ff9633',
        bounce: isSpark,
      });
    }

    this.addDecal(e.x + Math.cos(hitAngle) * 6, e.y + Math.sin(hitAngle) * 6, heavy ? 5 : 3, '#540e14', 'blood');

    if (e.hp <= 0) {
      this.onEnemyKilled(e, stats);
    } else if (e.state !== 'WINDUP' && e.kind !== 'brute' && e.kind !== 'warden' && e.kind !== 'boss') {
      if (e.evadeCooldown <= 0 && Math.random() < 0.38) {
        e.state = 'EVADE';
        e.stateTimer = 0.22;
        e.evadeCooldown = 2.2;
        const backAngle = hitAngle + (Math.random() - 0.5) * 0.9;
        e.vx = Math.cos(backAngle) * 195;
        e.vy = Math.sin(backAngle) * 195;
      } else {
        e.state = 'RECOVER';
        e.stateTimer = 0.16;
      }
    }
  }

  private onEnemyKilled(e: EnemyEntity, stats: ReturnType<typeof computeDerivedStats>) {
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) this.enemies.splice(idx, 1);
    this.enemyLastPos.delete(e.id);
    this.enemyEngaged.delete(e.id);

    this.kills += 1;
    if (stats.killDashReset) {
      this.player.dashCooldown = 0;
      this.player.adrenalineTimer = 3.0;
    }

    this.spawnShockwave(e.x, e.y, e.isBoss ? 76 : 36, e.isBoss ? '#ff8a3d' : '#ff4d4d', e.isBoss ? 0.38 : 0.24);
    this.spawnSpeedLines(e.x, e.y, 0, e.isBoss ? 18 : 8, '#ffad52', Math.PI);

    const splatCount = this.settings.quality === 'low' ? 9 : e.isBoss ? 36 : 18;
    for (let i = 0; i < splatCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 25 + Math.random() * (e.isBoss ? 145 : 95);
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 2,
        color: i % 4 === 0 ? '#ff9d3b' : '#8a141d',
        life: 0.35 + Math.random() * 0.35,
        maxLife: 0.7,
        lightRadius: i % 4 === 0 ? 24 : 0,
        lightColor: '#ff8822',
      });
    }
    this.addDecal(e.x, e.y, e.isBoss ? 12 : 7, '#42090e', 'blood');

    const lockedSkills = ALL_SKILL_IDS.filter((id) => !this.player.unlockedSkills.includes(id));
    const oilWickCount = this.player.artifacts.oil_wick || 0;
    const lootBoost = oilWickCount * 0.08;

    if (e.isBoss) {
      this.triggerShake(10);
      if (lockedSkills.length > 0) {
        this.spawnLootDrop(e.x - 14, e.y, 'SKILL_BOOK', lockedSkills[0]);
      }
      this.spawnLootDrop(e.x + 12, e.y - 6, 'ARTIFACT');
      this.spawnLootDrop(e.x + 12, e.y + 8, 'ARTIFACT');
      this.spawnLootDrop(e.x, e.y + 12, 'MEDKIT');
      return;
    }

    const roll = Math.random();
    if (lockedSkills.length > 0 && (e.kind === 'warden' || roll < 0.14 + lootBoost * 0.4)) {
      this.spawnLootDrop(e.x, e.y, 'SKILL_BOOK', lockedSkills[0]);
    } else if (e.kind === 'warden' || roll < 0.25 + lootBoost) {
      this.spawnLootDrop(e.x, e.y, 'ARTIFACT');
    } else if (roll < 0.58 + lootBoost) {
      this.spawnLootDrop(e.x, e.y, Math.random() < 0.65 ? 'MEDKIT' : 'OIL');
    }
  }

  private damageCrate(c: CrateEntity, dmg: number) {
    c.hp -= dmg;
    sound.playCrateBreak();
    this.triggerShake(2.6);
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x: c.x,
        y: c.y,
        vx: Math.cos(a) * (30 + Math.random() * 60),
        vy: Math.sin(a) * (30 + Math.random() * 60),
        size: 2,
        color: c.kind === 'locker' ? '#7a8791' : '#7a5233',
        life: 0.35,
        maxLife: 0.35,
        lightRadius: 0,
        lightColor: '#000',
      });
    }
    if (c.hp <= 0) {
      c.broken = true;
      this.addDecal(c.x, c.y, 6, '#2b1e14', 'splinter');
      if (c.hasLoot) {
        const lockedSkills = ALL_SKILL_IDS.filter((id) => !this.player.unlockedSkills.includes(id));
        const roll = Math.random();
        if (lockedSkills.length > 0 && c.kind === 'locker' && roll < 0.35) {
          this.spawnLootDrop(c.x, c.y, 'SKILL_BOOK', lockedSkills[0]);
        } else if (c.kind === 'locker' && roll < 0.68) {
          this.spawnLootDrop(c.x, c.y, 'ARTIFACT');
        } else if (roll < 0.26) {
          this.spawnLootDrop(c.x, c.y, 'ARTIFACT');
        } else {
          this.spawnLootDrop(c.x, c.y, Math.random() < 0.6 ? 'MEDKIT' : 'OIL');
        }
      }
    }
  }

  private spawnLootDrop(x: number, y: number, kind: LootDrop['kind'], skillId?: SkillId) {
    const a = Math.random() * Math.PI * 2;
    this.drops.push({
      id: `drop_${Math.random().toString(36).slice(2)}`,
      x,
      y,
      vx: Math.cos(a) * 35,
      vy: Math.sin(a) * 35,
      kind,
      artifactId: kind === 'ARTIFACT' ? pickRandomArtifact(this.player.artifacts) : undefined,
      skillId,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  private updateEnemies(dt: number, stats: ReturnType<typeof computeDerivedStats>) {
    const p = this.player;
    const diff = this.settings.difficulty;
    const diffDmgMult = diff === 'nightmare' ? 1.55 : diff === 'hard' ? 1.24 : 1.0;
    const diffSpdMult = diff === 'nightmare' ? 1.26 : diff === 'hard' ? 1.12 : 0.96;
    const diffCdMult = diff === 'nightmare' ? 0.74 : diff === 'hard' ? 0.88 : 1.0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.evadeCooldown = Math.max(0, e.evadeCooldown - dt);

      if (e.bleedTimer > 0) {
        e.bleedTimer -= dt;
        e.hp -= e.bleedDps * dt;
        if (Math.random() < 0.12) {
          this.addDecal(e.x, e.y, 2, '#4d0a10', 'blood');
        }
        if (e.hp <= 0) {
          this.onEnemyKilled(e, stats);
          continue;
        }
      }

      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const dist = Math.hypot(dx, dy);
      const angleToPlayer = Math.atan2(dy, dx);

      if (!e.alerted) {
        const lampReach = 122 * stats.lampRadiusMult;
        if (dist < lampReach) {
          e.alerted = true;
          e.state = 'CHASE';
          this.enemyEngaged.add(e.id);
        }
      }

      const bossPhase2 = Boolean(e.isBoss && e.hp <= e.maxHp * 0.5);
      const speedFloorMult = (1 + Math.min(0.65, (this.floor - 1) * 0.065)) * diffSpdMult * (bossPhase2 ? 1.18 : 1);
      const baseSpeed =
        (e.kind === 'boss'
          ? 92
          : e.kind === 'duelist'
            ? 104
            : e.kind === 'stalker'
              ? 92
              : e.kind === 'brute'
                ? 68
                : 82) * speedFloorMult;

      e.stateTimer -= dt;

      if (e.state === 'STAGGERED') {
        e.vx *= Math.pow(0.02, dt);
        e.vy *= Math.pow(0.02, dt);
        if (e.stateTimer <= 0) {
          e.state = 'CIRCLE';
          e.stateTimer = 0.45;
          this.enemyEngaged.add(e.id);
        }
      } else if (e.state === 'EVADE') {
        e.angle = angleToPlayer;
        e.vx *= Math.pow(0.08, dt);
        e.vy *= Math.pow(0.08, dt);
        if (e.stateTimer <= 0) {
          e.state = 'CIRCLE';
          e.stateTimer = 0.4;
          this.enemyEngaged.add(e.id);
        }
      } else if (e.state === 'PATROL') {
        if (e.stateTimer <= 0) {
          e.angle += (Math.random() - 0.5) * 2.2;
          e.stateTimer = 0.9 + Math.random() * 1.2;
        }
        if (this.isSolidAt(e.x + Math.cos(e.angle) * 14, e.y + Math.sin(e.angle) * 14)) {
          e.angle += Math.PI * 0.75;
        }
        e.vx = Math.cos(e.angle) * 24;
        e.vy = Math.sin(e.angle) * 24;
      } else if (e.state === 'CHASE') {
        const steerAngle = this.getChaseSteerAngle(e.x, e.y);
        e.angle = steerAngle;
        e.vx += (Math.cos(steerAngle) * baseSpeed - e.vx) * Math.min(1, dt * 11);
        e.vy += (Math.sin(steerAngle) * baseSpeed - e.vy) * Math.min(1, dt * 11);

        const engageDist = e.kind === 'boss' ? 62 : e.kind === 'brute' || e.kind === 'warden' ? 38 : 50;
        if (dist < engageDist && this.hasLineOfSight(e.x, e.y, p.x, p.y)) {
          this.enemyEngaged.add(e.id);
          if (e.attackCooldown <= 0) {
            this.startEnemyWindup(e, false, bossPhase2);
          } else {
            e.state = 'CIRCLE';
            e.stateTimer = 0.4 + Math.random() * 0.45;
          }
        }
      } else if (e.state === 'CIRCLE') {
        if (!this.hasLineOfSight(e.x, e.y, p.x, p.y) || dist > 90) {
          e.state = 'CHASE';
          e.stateTimer = 0.4;
        } else {
          e.angle = angleToPlayer;
          const perp = angleToPlayer + (Math.PI / 2) * e.strafeDir;
          const radialPush = dist > 56 ? 0.55 : dist < 26 ? -0.55 : 0;
          const moveX = Math.cos(perp) * 0.85 + Math.cos(angleToPlayer) * radialPush;
          const moveY = Math.sin(perp) * 0.85 + Math.sin(angleToPlayer) * radialPush;
          const mLen = Math.hypot(moveX, moveY) || 1;
          const strafeSpeed = e.kind === 'duelist' ? baseSpeed * 1.1 : baseSpeed * 0.88;

          e.vx += ((moveX / mLen) * strafeSpeed - e.vx) * Math.min(1, dt * 10);
          e.vy += ((moveY / mLen) * strafeSpeed - e.vy) * Math.min(1, dt * 10);

          if (e.attackCooldown <= 0 && dist < (e.kind === 'boss' ? 80 : e.kind === 'duelist' ? 72 : 52)) {
            this.enemyEngaged.add(e.id);
            this.startEnemyWindup(e, false, bossPhase2);
          } else if (e.stateTimer <= 0) {
            e.strafeDir *= -1;
            e.state = dist > 75 ? 'CHASE' : 'CIRCLE';
            e.stateTimer = 0.45 + Math.random() * 0.45;
          }
        }
      } else if (e.state === 'WINDUP') {
        this.enemyEngaged.add(e.id);
        const diffAng = normAngle(angleToPlayer - e.angle);
        e.angle += diffAng * Math.min(1, dt * 6.5);
        e.vx *= Math.pow(0.01, dt);
        e.vy *= Math.pow(0.01, dt);

        if (e.stateTimer <= 0) {
          e.state = 'ATTACK';
          e.stateTimer = e.kind === 'boss' ? 0.24 : e.kind === 'brute' ? 0.22 : 0.16;
          e.hasDealtDamageThisSwing = false;
          e.parriedWindow = true;

          const lungeSpeed =
            (e.kind === 'boss' ? (bossPhase2 ? 275 : 250) : e.kind === 'duelist' ? 245 : e.kind === 'stalker' ? 205 : 168) *
            diffSpdMult;
          e.vx = Math.cos(e.angle) * lungeSpeed;
          e.vy = Math.sin(e.angle) * lungeSpeed;

          const reach = e.kind === 'boss' ? 44 : e.kind === 'brute' || e.kind === 'warden' ? 31 : 26;
          this.slashes.push({
            x: e.x,
            y: e.y,
            angle: e.angle,
            arcWidth: e.kind === 'boss' ? 2.7 : e.kind === 'brute' ? 2.2 : 1.9,
            radius: reach,
            life: 0.16,
            maxLife: 0.16,
            color: e.kind === 'boss' ? '#ff6a2b' : '#ff3b4e',
            isEnemy: true,
          });
          if (e.kind === 'boss' && bossPhase2 && e.comboCount >= 2) {
            this.spawnShockwave(e.x, e.y, 52, '#ff4d36', 0.28);
            this.triggerShake(4.2);
          }
          sound.playSlash(e.kind === 'boss' ? 2 : 0);
        }
      } else if (e.state === 'ATTACK') {
        e.vx *= Math.pow(0.05, dt);
        e.vy *= Math.pow(0.05, dt);

        if (!e.hasDealtDamageThisSwing) {
          const strikeReach = e.kind === 'boss' ? 42 : e.kind === 'brute' || e.kind === 'warden' ? 30 : 25;
          if (dist <= strikeReach + p.radius) {
            if (p.parryTimer > 0) {
              this.triggerParry(e, stats);
              continue;
            } else if (p.invulnTimer <= 0) {
              e.hasDealtDamageThisSwing = true;
              const floorDmgMult = 1 + Math.min(0.85, (this.floor - 1) * 0.06);
              const baseRaw =
                e.kind === 'boss'
                  ? 38
                  : e.kind === 'warden'
                    ? 30
                    : e.kind === 'brute'
                      ? 25
                      : e.kind === 'duelist'
                        ? 21
                        : 17;
              this.damagePlayer(Math.round(baseRaw * floorDmgMult * diffDmgMult), Math.atan2(dy, dx), stats);
            }
          }
        }

        if (e.stateTimer <= 0) {
          e.parriedWindow = false;
          const maxCombo = e.kind === 'boss' ? (bossPhase2 ? 3 : 2) : e.kind === 'warden' ? 2 : e.kind === 'duelist' ? 1 : 0;
          if (e.comboCount < maxCombo && dist < 74) {
            e.comboCount += 1;
            this.startEnemyWindup(e, true, bossPhase2);
          } else {
            e.comboCount = 0;
            e.state = 'RECOVER';
            e.stateTimer = (e.kind === 'boss' ? 0.38 : e.kind === 'brute' ? 0.48 : 0.32) * diffCdMult;
            e.attackCooldown = (e.kind === 'boss' ? (bossPhase2 ? 0.42 : 0.52) : e.kind === 'duelist' ? 0.52 : 0.8) * diffCdMult;
          }
        }
      } else if (e.state === 'RECOVER') {
        e.vx *= Math.pow(0.02, dt);
        e.vy *= Math.pow(0.02, dt);
        if (e.stateTimer <= 0) {
          e.state = 'CIRCLE';
          e.stateTimer = 0.45;
          this.enemyEngaged.add(e.id);
        }
      }

      if (Math.hypot(e.vx, e.vy) > 12) {
        e.walkPhase += dt * 13;
      }

      this.moveCircleWithCollisions(e, e.vx * dt, e.vy * dt);

      // Wall-stuck detector & safe-zone teleport
      let tracker = this.enemyLastPos.get(e.id);
      if (!tracker) {
        tracker = { x: e.x, y: e.y, stuckTimer: 0 };
        this.enemyLastPos.set(e.id, tracker);
      }

      const insideSolid = !this.canEntityOccupy(e.x, e.y, e.radius);
      const movedDist = Math.hypot(e.x - tracker.x, e.y - tracker.y);
      const tryingToMove = (e.state === 'CHASE' || e.state === 'CIRCLE' || e.state === 'PATROL') && Math.hypot(e.vx, e.vy) > 16;

      if (insideSolid) {
        this.teleportEnemyToSafeZone(e);
        tracker.x = e.x;
        tracker.y = e.y;
        tracker.stuckTimer = 0;
      } else if (tryingToMove && movedDist < 1.2) {
        tracker.stuckTimer += dt;
        if (tracker.stuckTimer > 0.85) {
          this.teleportEnemyToSafeZone(e);
          tracker.x = e.x;
          tracker.y = e.y;
          tracker.stuckTimer = 0;
        }
      } else {
        tracker.x = e.x;
        tracker.y = e.y;
        tracker.stuckTimer = 0;
      }
    }

    // Safe enemy-enemy separation that respects walls & boilers!
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i];
        const b = this.enemies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = a.radius + b.radius + 2;
        if (d > 0.01 && d < minD) {
          const push = (minD - d) * 0.5;
          const px = (dx / d) * push;
          const py = (dy / d) * push;
          this.moveCircleWithCollisions(a, -px, -py);
          this.moveCircleWithCollisions(b, px, py);
        }
      }
    }
  }

  private startEnemyWindup(e: EnemyEntity, fastCombo = false, bossPhase2 = false) {
    e.state = 'WINDUP';
    const diffMult = this.settings.difficulty === 'nightmare' ? 0.78 : this.settings.difficulty === 'hard' ? 0.88 : 1.0;
    const baseWindup =
      (e.kind === 'boss' ? (bossPhase2 ? 0.36 : 0.42) : e.kind === 'brute' ? 0.5 : e.kind === 'warden' ? 0.42 : 0.34) *
      diffMult;
    e.stateTimer = fastCombo ? baseWindup * 0.62 : baseWindup;
    sound.playEnemyGlint();
  }

  private triggerParry(attacker: EnemyEntity, stats: ReturnType<typeof computeDerivedStats>) {
    const p = this.player;
    this.parries += 1;
    p.parryTimer = 0;
    p.parryCooldown = 0.1;
    p.parrySuccessFlash = 0.35;
    p.invulnTimer = 0.35;
    p.stamina = p.maxStamina;

    attacker.hasDealtDamageThisSwing = true;
    attacker.state = 'STAGGERED';
    attacker.stateTimer = (attacker.isBoss ? 1.45 : 1.9) * (1 + stats.staggerDurationBonus);
    attacker.comboCount = 0;

    const pushAngle = Math.atan2(attacker.y - p.y, attacker.x - p.x);
    attacker.vx = Math.cos(pushAngle) * (attacker.isBoss ? 75 : 145);
    attacker.vy = Math.sin(pushAngle) * (attacker.isBoss ? 75 : 145);

    this.triggerHitStop(0.085);
    this.triggerShake(9.5);
    this.globalFlash = 1.0;
    this.globalFlashColor = '#a8f3ff';
    sound.playParry();
    this.gamepad.rumble(0.95, 0.85, 190);

    const midX = (p.x + attacker.x) / 2;
    const midY = (p.y + attacker.y) / 2;

    this.slashes.push({
      x: midX,
      y: midY,
      angle: 0,
      arcWidth: Math.PI * 2,
      radius: 28,
      life: 0.22,
      maxLife: 0.22,
      color: '#9bf5ff',
      isEnemy: false,
      isParryShock: true,
    });
    this.spawnShockwave(midX, midY, 54, '#9bf5ff', 0.28);
    this.spawnShockwave(midX, midY, 34, '#ffd25a', 0.2);
    this.spawnSpeedLines(midX, midY, 0, 14, '#a8f8ff', Math.PI);

    this.floatingTexts.push({
      x: p.x,
      y: p.y - 14,
      vy: -22,
      text: I18N[this.lang].parryShout,
      color: '#9bf5ff',
      life: 0.85,
      maxLife: 0.85,
    });

    const sparkCount = this.settings.quality === 'low' ? 14 : 30;
    for (let i = 0; i < sparkCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 65 + Math.random() * 180;
      const isCyan = i % 2 === 0;
      this.particles.push({
        x: midX,
        y: midY,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: i % 4 === 0 ? 2 : 1,
        color: isCyan ? '#a8f8ff' : '#ffd25a',
        life: 0.35 + Math.random() * 0.4,
        maxLife: 0.75,
        lightRadius: 34,
        lightColor: isCyan ? '#66e6ff' : '#ffaa33',
        bounce: true,
      });
    }

    if (stats.parryNovaDmg > 0) {
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const other = this.enemies[i];
        if (Math.hypot(other.x - p.x, other.y - p.y) < 82) {
          this.damageEnemy(
            other,
            stats.parryNovaDmg,
            Math.atan2(other.y - p.y, other.x - p.x),
            true,
            false,
            stats
          );
        }
      }
    }
  }

  private damagePlayer(rawDmg: number, hitAngle: number, stats: ReturnType<typeof computeDerivedStats>) {
    const p = this.player;
    this.combatTimer = Math.max(this.combatTimer, 5.0);
    const dmg = Math.max(1, Math.round(rawDmg * (1 - stats.damageReduction) * stats.incomingDamageMult));
    p.hp = Math.max(0, p.hp - dmg);
    p.invulnTimer = 0.55;
    p.hitFlash = 0.18;
    p.vx += Math.cos(hitAngle) * 145;
    p.vy += Math.sin(hitAngle) * 145;

    this.triggerHitStop(0.055);
    this.triggerShake(8.0);
    this.globalFlash = 0.45;
    this.globalFlashColor = '#ff2a38';
    sound.playPlayerHurt();
    this.gamepad.rumble(0.85, 0.5, 160);

    this.floatingTexts.push({
      x: p.x,
      y: p.y - 12,
      vy: -20,
      text: `-${dmg}`,
      color: '#ff424e',
      life: 0.75,
      maxLife: 0.75,
    });

    for (let i = 0; i < 10; i++) {
      const a = hitAngle + (Math.random() - 0.5) * 1.4;
      this.particles.push({
        x: p.x,
        y: p.y,
        vx: Math.cos(a) * (40 + Math.random() * 80),
        vy: Math.sin(a) * (40 + Math.random() * 80),
        size: 2,
        color: '#b81d26',
        life: 0.3,
        maxLife: 0.3,
        lightRadius: 0,
        lightColor: '#000',
      });
    }

    if (stats.damageReduction > 0) {
      for (const e of this.enemies) {
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < 46 && d > 0.1) {
          e.vx += ((e.x - p.x) / d) * 160;
          e.vy += ((e.y - p.y) / d) * 160;
        }
      }
    }

    if (p.hp <= 0) {
      this.saveRecords();
    }
  }

  private updateDropsAndInteract(dt: number, input: InputSnapshot, stats: ReturnType<typeof computeDerivedStats>) {
    const p = this.player;
    this.currentInteract = null;
    const t = I18N[this.lang];
    const interactBtn: '△' | 'Y' = this.settings.controllerType === 'xbox' ? 'Y' : '△';

    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= Math.pow(0.02, dt);
      d.vy *= Math.pow(0.02, dt);

      const dist = Math.hypot(d.x - p.x, d.y - p.y);
      if (d.kind === 'MEDKIT' && dist < 16 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 35);
        sound.playLoot(false);
        this.floatingTexts.push({ x: p.x, y: p.y - 12, vy: -18, text: '+35 HP', color: '#63e678', life: 0.8, maxLife: 0.8 });
        this.drops.splice(i, 1);
        continue;
      }
      if (d.kind === 'OIL' && dist < 16 && p.lampFuel < 98) {
        p.lampFuel = Math.min(100, p.lampFuel + 45);
        sound.playLoot(false);
        this.floatingTexts.push({ x: p.x, y: p.y - 12, vy: -18, text: t.floatLamp, color: '#ffd266', life: 0.8, maxLife: 0.8 });
        this.drops.splice(i, 1);
        continue;
      }

      if (d.kind === 'ARTIFACT' && dist < 24 && d.artifactId) {
        const artText = t.artifacts[d.artifactId];
        this.currentInteract = {
          button: interactBtn,
          label: t.promptTakeArtifact(artText.name),
          sublabel: artText.desc,
        };
        if (input.interactPressed) {
          this.collectArtifact(d.artifactId);
          this.drops.splice(i, 1);
          break;
        }
      }

      if (d.kind === 'SKILL_BOOK' && dist < 24 && d.skillId) {
        const skText = t.skills[d.skillId];
        this.currentInteract = {
          button: interactBtn,
          label: t.promptTakeSkillBook(skText.name),
          sublabel: skText.shortDesc,
        };
        if (input.interactPressed) {
          this.collectSkillBook(d.skillId);
          this.drops.splice(i, 1);
          break;
        }
      }
    }

    if (!this.currentInteract) {
      for (const c of this.crates) {
        if (c.broken) continue;
        if (Math.hypot(c.x - p.x, c.y - p.y) < 22) {
          this.currentInteract = {
            button: interactBtn,
            label: c.kind === 'locker' ? t.promptUnlockLocker : t.promptSearchCrate,
          };
          if (input.interactPressed) {
            this.damageCrate(c, 999);
          }
          break;
        }
      }
    }

    if (!this.currentInteract) {
      const distHatch = Math.hypot(this.map.hatch.x - p.x, this.map.hatch.y - p.y);
      if (distHatch < 26) {
        if (this.map.hatchUnlocked) {
          this.currentInteract = {
            button: interactBtn,
            label: t.promptDescend(this.floor + 1),
          };
          if (input.interactPressed) {
            sound.playHatchUnlock();
            this.saveRecords();
            const nextFloor = this.floor + 1;
            this.loadFloor(nextFloor);
            if (nextFloor % 10 === 0) {
              this.showToast(t.toastBossTitle(nextFloor), t.toastBossSub, '#ff5938');
            } else {
              this.showToast(t.toastFloorNTitle(nextFloor), t.toastFloorNSub, '#e5a243');
            }
          }
        } else {
          this.currentInteract = {
            button: interactBtn,
            label: t.promptHatchLocked(this.enemies.length),
          };
        }
      }
    }

    void stats;
  }

  private collectArtifact(id: ArtifactId) {
    this.player.artifacts[id] = (this.player.artifacts[id] || 0) + 1;
    const newStats = computeDerivedStats(this.player.artifacts);
    this.cachedStats = newStats;
    const hpBonus = newStats.maxHp - this.player.maxHp;
    this.player.maxHp = newStats.maxHp;
    if (hpBonus > 0) this.player.hp += hpBonus;

    const def = ARTIFACTS[id];
    const t = I18N[this.lang];
    const artText = t.artifacts[id];
    sound.playLoot(true);
    this.gamepad.rumble(0.45, 0.55, 160);
    this.globalFlash = 0.35;
    this.globalFlashColor = def.color;
    this.showToast(`${t.toastArtifactPrefix}: ${artText.name}`, artText.desc, def.color);
  }

  private collectSkillBook(skillId: SkillId) {
    const isFirstTime = !this.player.unlockedSkills.includes(skillId);
    const def = SKILLS[skillId];
    if (isFirstTime) {
      this.player.unlockedSkills.push(skillId);
      if (def.category === 'SECONDARY' && !this.player.slotR1) {
        this.player.slotR1 = skillId;
      }
      this.pendingSkillBookPrompt = skillId;
    }

    const t = I18N[this.lang];
    const skText = t.skills[skillId];
    sound.playLoot(true);
    this.gamepad.rumble(0.55, 0.65, 190);
    this.globalFlash = 0.45;
    this.globalFlashColor = def.color;
    this.showToast(`${t.toastSkillPrefix}: ${skText.name}`, skText.shortDesc, def.color);
  }

  private updateParticlesOnly(dt: number) {
    const drag = Math.pow(0.12, dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        swapRemove(this.particles, i);
        continue;
      }
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= drag;
      pt.vy *= drag;
    }
  }

  private updateEffects(dt: number) {
    for (let i = this.slashes.length - 1; i >= 0; i--) {
      this.slashes[i].life -= dt;
      if (this.slashes[i].life <= 0) swapRemove(this.slashes, i);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        swapRemove(this.shockwaves, i);
        continue;
      }
      const prog = 1 - sw.life / sw.maxLife;
      const inv = 1 - prog;
      sw.radius = 4 + (sw.maxRadius - 4) * (1 - inv * inv);
    }

    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      const sl = this.speedLines[i];
      sl.life -= dt;
      if (sl.life <= 0) {
        swapRemove(this.speedLines, i);
        continue;
      }
      sl.x += Math.cos(sl.angle) * sl.spd * dt;
      sl.y += Math.sin(sl.angle) * sl.spd * dt;
    }

    for (let i = this.afterImages.length - 1; i >= 0; i--) {
      this.afterImages[i].life -= dt;
      if (this.afterImages[i].life <= 0) swapRemove(this.afterImages, i);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y += ft.vy * dt;
      if (ft.life <= 0) swapRemove(this.floatingTexts, i);
    }

    const drag = Math.pow(0.14, dt);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        swapRemove(this.particles, i);
        continue;
      }
      const nx = pt.x + pt.vx * dt;
      const ny = pt.y + pt.vy * dt;
      if (pt.bounce) {
        if (this.isSolidAt(nx, pt.y)) pt.vx *= -0.65;
        else pt.x = nx;
        if (this.isSolidAt(pt.x, ny)) pt.vy *= -0.65;
        else pt.y = ny;
      } else {
        pt.x = nx;
        pt.y = ny;
      }
      pt.vx *= drag;
      pt.vy *= drag;
    }
  }

  private addDecal(x: number, y: number, radius: number, color: string, kind: Decal['kind']) {
    if (this.decals.length > 100) this.decals.shift();
    this.decals.push({ x, y, radius, color, kind });
  }

  private isSolidAt(wx: number, wy: number): boolean {
    const tx = Math.floor(wx / this.map.tileSize);
    const ty = Math.floor(wy / this.map.tileSize);
    if (ty < 0 || ty >= this.map.height || tx < 0 || tx >= this.map.width) return true;
    const t = this.map.tiles[ty][tx];
    return t === 0 || t === 4;
  }

  private canEntityOccupy(cx: number, cy: number, r: number): boolean {
    return (
      !this.isSolidAt(cx, cy) &&
      !this.isSolidAt(cx - r, cy - r) &&
      !this.isSolidAt(cx + r, cy - r) &&
      !this.isSolidAt(cx - r, cy + r) &&
      !this.isSolidAt(cx + r, cy + r)
    );
  }

  private findNearestSafeTileCenter(wx: number, wy: number, radius: number): { x: number; y: number } {
    const ts = this.map.tileSize;
    const startTx = clamp(Math.floor(wx / ts), 1, this.map.width - 2);
    const startTy = clamp(Math.floor(wy / ts), 1, this.map.height - 2);

    let fallback: { x: number; y: number } | null = null;
    for (let rad = 0; rad <= 12; rad++) {
      for (let oy = -rad; oy <= rad; oy++) {
        for (let ox = -rad; ox <= rad; ox++) {
          if (Math.abs(ox) !== rad && Math.abs(oy) !== rad) continue;
          const tx = startTx + ox;
          const ty = startTy + oy;
          if (!this.isWalkableTile(tx, ty)) continue;
          const cx = (tx + 0.5) * ts;
          const cy = (ty + 0.5) * ts;
          if (!this.canEntityOccupy(cx, cy, radius)) continue;
          const openNeighbors =
            (this.isWalkableTile(tx + 1, ty) ? 1 : 0) +
            (this.isWalkableTile(tx - 1, ty) ? 1 : 0) +
            (this.isWalkableTile(tx, ty + 1) ? 1 : 0) +
            (this.isWalkableTile(tx, ty - 1) ? 1 : 0);
          if (openNeighbors === 4) {
            return { x: cx, y: cy };
          }
          if (!fallback) fallback = { x: cx, y: cy };
        }
      }
      if (fallback && rad >= 2) return fallback;
    }
    return fallback ?? { x: this.map.spawn.x, y: this.map.spawn.y };
  }

  private teleportEnemyToSafeZone(e: EnemyEntity) {
    const safe = this.findNearestSafeTileCenter(e.x, e.y, e.radius);
    e.x = safe.x;
    e.y = safe.y;
    e.vx = 0;
    e.vy = 0;
    for (let k = 0; k < 5; k++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * 28,
        vy: Math.sin(a) * 28,
        size: 2,
        color: '#6e6573',
        life: 0.28,
        maxLife: 0.28,
        lightRadius: 0,
        lightColor: '#000',
      });
    }
  }

  private moveCircleWithCollisions(ent: { x: number; y: number; radius: number }, dx: number, dy: number) {
    const r = ent.radius;
    if (this.canEntityOccupy(ent.x + dx, ent.y, r)) ent.x += dx;
    if (this.canEntityOccupy(ent.x, ent.y + dy, r)) ent.y += dy;
  }

  // Live lit basement floor backdrop for the Title Menu!
  public renderMenuBackdrop(ctx: CanvasRenderingContext2D, nowMs: number) {
    const targetW = ctx.canvas.width;
    const targetH = ctx.canvas.height;
    const scaleX = targetW / LOGICAL_W;
    const scaleY = targetH / LOGICAL_H;
    const t = nowMs * 0.001;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#09080c';
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    const driftX = Math.sin(t * 0.25) * 28;
    const driftY = Math.cos(t * 0.19) * 16;
    const cx = Math.round(32 * this.map.tileSize - LOGICAL_W / 2 + driftX);
    const cy = Math.round(24 * this.map.tileSize - LOGICAL_H / 2 + driftY);

    ctx.save();
    ctx.translate(-cx, -cy);

    const srcX = clamp(cx, 0, Math.max(0, this.mapCacheCanvas.width - LOGICAL_W));
    const srcY = clamp(cy, 0, Math.max(0, this.mapCacheCanvas.height - LOGICAL_H));
    ctx.drawImage(this.mapCacheCanvas, srcX, srcY, LOGICAL_W, LOGICAL_H, srcX, srcY, LOGICAL_W, LOGICAL_H);

    drawHatch(ctx, this.map.hatch.x, this.map.hatch.y, true, t);
    for (const c of this.crates) drawCrate(ctx, c);
    for (const drop of this.drops) drawLootDrop(ctx, drop, t);

    ctx.restore();

    // Warm well-lit basement ambiance (brighter than gameplay so players can admire the cellar)
    const lctx = this.lightCtx;
    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = 'rgba(8, 8, 12, 0.56)';
    lctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
    lctx.globalCompositeOperation = 'destination-out';

    const punch = (sx: number, sy: number, r: number, a: number) => {
      lctx.globalAlpha = a;
      lctx.drawImage(this.maskGlowSprite, sx - r, sy - r, r * 2, r * 2);
    };

    punch(LOGICAL_W * 0.5, LOGICAL_H * 0.48, 185, 0.92);
    for (const wl of this.map.wallLamps) {
      punch(wl.x - cx, wl.y - cy, 90, 0.78);
    }
    lctx.globalAlpha = 1;
    ctx.drawImage(this.lightCanvas, 0, 0);

    // Subtle warm lamp tint wash
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.22;
    const warm = this.getColorGlowSprite('#ffb85c');
    ctx.drawImage(warm, LOGICAL_W * 0.5 - 170, LOGICAL_H * 0.45 - 140, 340, 280);
    ctx.restore();

    ctx.restore();
  }

  public render(ctx: CanvasRenderingContext2D) {
    const targetW = ctx.canvas.width;
    const targetH = ctx.canvas.height;
    const scaleX = targetW / LOGICAL_W;
    const scaleY = targetH / LOGICAL_H;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, targetW, targetH);

    ctx.save();
    ctx.scale(scaleX, scaleY);

    const shakeX = this.shakeMag > 0.2 ? Math.round((Math.random() - 0.5) * this.shakeMag * 2) : 0;
    const shakeY = this.shakeMag > 0.2 ? Math.round((Math.random() - 0.5) * this.shakeMag * 2) : 0;
    const cx = Math.round(this.camX) + shakeX;
    const cy = Math.round(this.camY) + shakeY;

    ctx.save();
    ctx.translate(-cx, -cy);

    const srcX = clamp(cx, 0, Math.max(0, this.mapCacheCanvas.width - LOGICAL_W));
    const srcY = clamp(cy, 0, Math.max(0, this.mapCacheCanvas.height - LOGICAL_H));
    ctx.drawImage(this.mapCacheCanvas, srcX, srcY, LOGICAL_W, LOGICAL_H, srcX, srcY, LOGICAL_W, LOGICAL_H);

    const minVx = cx - 24;
    const maxVx = cx + LOGICAL_W + 24;
    const minVy = cy - 24;
    const maxVy = cy + LOGICAL_H + 24;

    for (let i = 0; i < this.decals.length; i++) {
      const d = this.decals[i];
      if (d.x < minVx || d.x > maxVx || d.y < minVy || d.y > maxVy) continue;
      ctx.fillStyle = d.color;
      ctx.fillRect(Math.round(d.x - d.radius * 0.5), Math.round(d.y - d.radius * 0.5), d.radius, d.radius);
    }

    drawHatch(ctx, this.map.hatch.x, this.map.hatch.y, this.map.hatchUnlocked, this.elapsed);
    for (let i = 0; i < this.crates.length; i++) {
      const c = this.crates[i];
      if (!c.broken && c.x >= minVx && c.x <= maxVx && c.y >= minVy && c.y <= maxVy) {
        drawCrate(ctx, c);
      }
    }
    for (let i = 0; i < this.drops.length; i++) {
      const drop = this.drops[i];
      if (drop.x >= minVx && drop.x <= maxVx && drop.y >= minVy && drop.y <= maxVy) {
        drawLootDrop(ctx, drop, this.elapsed);
      }
    }

    for (let i = 0; i < this.afterImages.length; i++) {
      const ai = this.afterImages[i];
      this.afterImageScratch.x = ai.x;
      this.afterImageScratch.y = ai.y;
      this.afterImageScratch.aimAngle = ai.angle;
      drawPlayer(ctx, this.afterImageScratch, this.elapsed, true);
    }

    const actors = this.renderActors;
    actors.length = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.x >= minVx - 16 && e.x <= maxVx + 16 && e.y >= minVy - 16 && e.y <= maxVy + 16) {
        actors.push({ y: e.y, draw: () => drawEnemy(ctx, e, this.elapsed) });
      }
    }
    actors.push({ y: this.player.y, draw: () => drawPlayer(ctx, this.player, this.elapsed) });
    if (actors.length > 1) actors.sort((a, b) => a.y - b.y);
    for (let i = 0; i < actors.length; i++) actors[i].draw();

    for (let i = 0; i < this.projectiles.length; i++) {
      const sp = this.projectiles[i];
      if (sp.x >= minVx && sp.x <= maxVx && sp.y >= minVy && sp.y <= maxVy) {
        drawProjectileSpark(ctx, sp);
      }
    }

    for (let i = 0; i < this.slashes.length; i++) {
      const s = this.slashes[i];
      const t = s.life / s.maxLife;
      ctx.globalAlpha = clamp(t * 1.25, 0, 1);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.isParryShock ? 3.5 : 5 * t + 1;
      ctx.beginPath();
      if (s.isFullCircle || s.isParryShock) {
        ctx.arc(
          Math.round(s.x),
          Math.round(s.y),
          s.radius * (s.isParryShock ? 1.3 - t * 0.4 : 1.05 - t * 0.2),
          0,
          Math.PI * 2
        );
      } else {
        ctx.arc(Math.round(s.x), Math.round(s.y), s.radius, s.angle - s.arcWidth * 0.5, s.angle + s.arcWidth * 0.5);
      }
      ctx.stroke();

      if (!s.isEnemy) {
        ctx.globalAlpha = clamp(t * 0.9, 0, 1);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, 2 * t);
        ctx.stroke();
      }
    }

    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const t = sw.life / sw.maxLife;
      ctx.globalAlpha = clamp(t * 0.9, 0, 1);
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(1, Math.round(2.5 * t));
      ctx.beginPath();
      ctx.arc(Math.round(sw.x), Math.round(sw.y), Math.round(sw.radius), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = 0; i < this.speedLines.length; i++) {
      const sl = this.speedLines[i];
      ctx.globalAlpha = clamp(sl.life / sl.maxLife, 0, 1);
      ctx.strokeStyle = sl.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.round(sl.x), Math.round(sl.y));
      ctx.lineTo(Math.round(sl.x - Math.cos(sl.angle) * sl.len), Math.round(sl.y - Math.sin(sl.angle) * sl.len));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      if (pt.x < minVx || pt.x > maxVx || pt.y < minVy || pt.y > maxVy) continue;
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
    }

    ctx.restore();

    if (!this.deepSettings.fullbright) {
      this.renderLightingFast(ctx, cx, cy);
    }

    if (this.deepSettings.colorMode !== 'default') {
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.globalAlpha = 0.45;
      ctx.fillStyle =
        this.deepSettings.colorMode === 'cold'
          ? '#4b7aa1'
          : this.deepSettings.colorMode === 'rust'
            ? '#a63829'
            : '#5aa13c';
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      ctx.restore();
    }

    if (this.floatingTexts.length > 0) {
      ctx.save();
      ctx.translate(-cx, -cy);
      ctx.font = 'bold 8px "Pixelify Sans", monospace';
      ctx.textAlign = 'center';
      for (let i = 0; i < this.floatingTexts.length; i++) {
        const ft = this.floatingTexts[i];
        const rx = Math.round(ft.x);
        const ry = Math.round(ft.y);
        ctx.globalAlpha = clamp(ft.life / ft.maxLife, 0, 1);
        ctx.fillStyle = '#070709';
        ctx.fillText(ft.text, rx + 1, ry + 1);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, rx, ry);
      }
      ctx.restore();
    }

    if (this.globalFlash > 0) {
      ctx.globalAlpha = this.globalFlash * 0.25;
      ctx.fillStyle = this.globalFlashColor;
      ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private renderLightingFast(mainCtx: CanvasRenderingContext2D, cx: number, cy: number) {
    const lctx = this.lightCtx;
    const actx = this.additiveCtx;
    const stats = this.cachedStats;

    lctx.globalCompositeOperation = 'source-over';
    lctx.fillStyle = 'rgba(4, 4, 7, 0.94)';
    lctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    const useAdditive = this.settings.quality !== 'low';
    if (useAdditive) {
      actx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
    }

    const px = Math.round(this.player.x - cx);
    const py = Math.round(this.player.y - cy);
    const fuelFactor = 0.78 + (this.player.lampFuel / 100) * 0.22;
    const lampRadius = 114 * stats.lampRadiusMult * fuelFactor * this.player.lampFlicker;

    lctx.globalCompositeOperation = 'destination-out';

    const drawMaskGlow = (sx: number, sy: number, r: number, alpha = 1) => {
      if (sx < -r || sx > LOGICAL_W + r || sy < -r || sy > LOGICAL_H + r) return;
      lctx.globalAlpha = alpha;
      lctx.drawImage(this.maskGlowSprite, sx - r, sy - r, r * 2, r * 2);
    };

    const drawColorGlow = (sx: number, sy: number, r: number, color: string, alpha: number) => {
      if (!useAdditive) return;
      if (sx < -r || sx > LOGICAL_W + r || sy < -r || sy > LOGICAL_H + r) return;
      const sprite = this.getColorGlowSprite(color);
      actx.globalAlpha = alpha;
      actx.drawImage(sprite, sx - r, sy - r, r * 2, r * 2);
    };

    drawMaskGlow(px, py, lampRadius, 0.98);
    drawMaskGlow(px, py, lampRadius * 0.45, 0.7);
    drawColorGlow(px, py, lampRadius * 0.85, '#ffb85c', 0.22);

    const addPointLight = (wx: number, wy: number, r: number, color: string, strength = 0.85, tintAlpha = 0.3) => {
      const sx = Math.round(wx - cx);
      const sy = Math.round(wy - cy);
      if (sx < -r || sx > LOGICAL_W + r || sy < -r || sy > LOGICAL_H + r) return;
      lctx.globalAlpha = strength;
      lctx.drawImage(this.maskGlowSprite, sx - r, sy - r, r * 2, r * 2);
      if (useAdditive) {
        actx.globalAlpha = tintAlpha;
        actx.drawImage(this.getColorGlowSprite(color), sx - r, sy - r, r * 2, r * 2);
      }
    };

    for (let i = 0; i < this.map.wallLamps.length; i++) {
      const wl = this.map.wallLamps[i];
      if (wl.dead) continue;
      const flick = Math.sin(this.elapsed * 9 + wl.phase) > -0.35 ? 1 : 0.25;
      addPointLight(wl.x, wl.y, 28 * flick, '#d97b29', 0.5 * flick, 0.22);
    }

    if (this.map.hatchUnlocked) {
      addPointLight(this.map.hatch.x, this.map.hatch.y, 48, '#ffaa33', 0.85, 0.32);
    } else {
      addPointLight(this.map.hatch.x, this.map.hatch.y, 20, '#b82525', 0.45, 0.22);
    }

    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      if (d.kind === 'ARTIFACT') {
        addPointLight(d.x, d.y, 28 + Math.sin(this.elapsed * 6) * 4, '#ffd25a', 0.7, 0.3);
      } else if (d.kind === 'SKILL_BOOK') {
        addPointLight(
          d.x,
          d.y,
          32 + Math.sin(this.elapsed * 7) * 5,
          SKILLS[d.skillId || 'whirlwind_rend'].color,
          0.8,
          0.35
        );
      }
    }

    for (let i = 0; i < this.projectiles.length; i++) {
      const sp = this.projectiles[i];
      addPointLight(sp.x, sp.y, 26, '#ffe05c', 0.75, 0.35);
    }

    for (let i = 0; i < this.slashes.length; i++) {
      const s = this.slashes[i];
      const t = s.life / s.maxLife;
      const rad = s.isParryShock ? 155 * t : s.isFullCircle ? 76 * t : 58 * t;
      addPointLight(s.x, s.y, Math.max(8, rad), s.color, Math.min(1, t * 1.15), s.isParryShock ? 0.55 : 0.36);
    }

    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const t = sw.life / sw.maxLife;
      addPointLight(sw.x, sw.y, Math.max(12, sw.radius * 1.3), sw.color, t * 0.85, 0.32);
    }

    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      if (pt.lightRadius > 0) {
        const t = pt.life / pt.maxLife;
        addPointLight(pt.x, pt.y, pt.lightRadius * t + 4, pt.lightColor, 0.75 * t, 0.28);
      }
    }

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.state === 'WINDUP') {
        addPointLight(e.x, e.y, e.isBoss ? 56 : 38, '#ff243c', 0.9, 0.45);
      } else if (e.isBoss) {
        addPointLight(e.x, e.y, 34, '#ff6b2b', 0.65, 0.3);
      } else if (e.alerted) {
        addPointLight(e.x, e.y, 13, '#d92136', 0.35, 0.22);
      }
    }

    lctx.globalAlpha = 1;
    actx.globalAlpha = 1;

    mainCtx.drawImage(this.lightCanvas, 0, 0);
    if (useAdditive) {
      mainCtx.save();
      mainCtx.globalCompositeOperation = 'lighter';
      mainCtx.drawImage(this.additiveCanvas, 0, 0);
      mainCtx.restore();
    }
  }

  public getHUDState(input: InputSnapshot): HUDState {
    const t = I18N[this.lang];
    const stats = this.cachedStats;
    const activeArtifacts = (Object.keys(this.player.artifacts) as ArtifactId[])
      .filter((id) => this.player.artifacts[id] > 0)
      .map((id) => ({
        def: {
          ...ARTIFACTS[id],
          name: t.artifacts[id].name,
          shortDesc: t.artifacts[id].desc,
        },
        count: this.player.artifacts[id],
      }));

    let currentRoomName = t.corridor;
    const ptx = this.player.x / this.map.tileSize;
    const pty = this.player.y / this.map.tileSize;
    for (const r of this.map.rooms) {
      if (ptx >= r.x && ptx <= r.x + r.w && pty >= r.y && pty <= r.y + r.h) {
        const names = t.rooms[r.kind];
        currentRoomName = names[r.alcoveIndex ?? 0] ?? names[0];
        break;
      }
    }

    const bossEntity = this.enemies.find((e) => e.isBoss);

    return {
      hp: Math.ceil(this.player.hp),
      maxHp: this.player.maxHp,
      stamina: Math.round(this.player.stamina),
      maxStamina: this.player.maxStamina,
      lampFuel: Math.round(this.player.lampFuel),
      floor: this.floor,
      isBossFloor: this.floor % 10 === 0,
      bossInfo: bossEntity
        ? {
            name: t.enemies.boss,
            hp: Math.max(0, Math.ceil(bossEntity.hp)),
            maxHp: bossEntity.maxHp,
            staggered: bossEntity.state === 'STAGGERED',
          }
        : null,
      enemiesAlive: this.enemies.length,
      enemiesTotal: this.totalEnemiesOnFloor,
      hatchUnlocked: this.map.hatchUnlocked,
      kills: this.kills,
      parries: this.parries,
      timeSurvived: this.timeSurvived,
      inCombat: this.combatTimer > 0,
      unlockedSkills: [...this.player.unlockedSkills],
      slotR2: this.player.slotR2,
      slotR1: this.player.slotR1,
      r1Cooldown: this.player.r1Cooldown,
      r2Cooldown: this.player.r2Cooldown,
      stats,
      artifacts: activeArtifacts,
      interactPrompt: this.currentInteract,
      toast: this.toast ? { ...this.toast } : null,
      currentRoomName,
      gamepadConnected: input.gamepadConnected,
      gamepadName: input.gamepadName,
      bestFloor: Math.max(this.bestFloor, this.floor),
      bestTime: Math.max(this.bestTime, this.timeSurvived),
    };
  }
}
