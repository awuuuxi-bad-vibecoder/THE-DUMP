import {
  CrateEntity,
  EnemyEntity,
  EnemyKind,
  FloorMap,
  FloorPalette,
  RoomDef,
  TileType,
  Vec2,
  WallSparkLamp,
} from './types';

export interface GeneratedFloor {
  map: FloorMap;
  crates: CrateEntity[];
  enemies: EnemyEntity[];
}

export const FLOOR_PALETTES: FloorPalette[] = [
  // Floors 1-10: Grimy Industrial Concrete & Rust
  {
    id: 0,
    wallVoid: '#09080b',
    wallFace: '#1d1b20',
    wallBrick: '#141216',
    wallTop: '#2c2930',
    floorA: '#1d1c20',
    floorB: '#201f24',
    floorC: '#19181c',
    seam: '#141317',
    puddle: '#141e26',
    puddleLight: '#1c2b36',
    machinery: '#2b2421',
    machineryTrim: '#7a4d2c',
  },
  // Floors 11-20: Flooded Verdigris Cistern
  {
    id: 1,
    wallVoid: '#070b0a',
    wallFace: '#16211e',
    wallBrick: '#0f1715',
    wallTop: '#233530',
    floorA: '#161e1c',
    floorB: '#192220',
    floorC: '#131a18',
    seam: '#0f1413',
    puddle: '#122629',
    puddleLight: '#1c3b40',
    machinery: '#222b29',
    machineryTrim: '#42786a',
  },
  // Floors 21-30: Scorched Slag & Furnace Ash
  {
    id: 2,
    wallVoid: '#0c0707',
    wallFace: '#261817',
    wallBrick: '#1a100f',
    wallTop: '#382321',
    floorA: '#211918',
    floorB: '#261c1b',
    floorC: '#1c1514',
    seam: '#140e0e',
    puddle: '#291713',
    puddleLight: '#452218',
    machinery: '#2d201c',
    machineryTrim: '#a8472a',
  },
  // Floors 31-40+: Deep Cryo-Steel Vault
  {
    id: 3,
    wallVoid: '#06070c',
    wallFace: '#181c29',
    wallBrick: '#10131c',
    wallTop: '#272f42',
    floorA: '#171a24',
    floorB: '#1b1f2b',
    floorC: '#141720',
    seam: '#0f1118',
    puddle: '#142033',
    puddleLight: '#1f3352',
    machinery: '#202636',
    machineryTrim: '#4c6d9c',
  },
];

function carveRect(tiles: TileType[][], x: number, y: number, w: number, h: number, type: TileType = 1) {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (ty > 0 && ty < tiles.length - 1 && tx > 0 && tx < tiles[0].length - 1) {
        tiles[ty][tx] = type;
      }
    }
  }
}

function carveOctagon(tiles: TileType[][], cx: number, cy: number, rx: number, ry: number, cut: number, type: TileType = 1) {
  for (let ty = cy - ry; ty <= cy + ry; ty++) {
    for (let tx = cx - rx; tx <= cx + rx; tx++) {
      if (ty <= 0 || ty >= tiles.length - 1 || tx <= 0 || tx >= tiles[0].length - 1) continue;
      const dx = Math.abs(tx - cx);
      const dy = Math.abs(ty - cy);
      if (dx + dy <= rx + ry - cut) {
        tiles[ty][tx] = type;
      }
    }
  }
}

function setTileRect(tiles: TileType[][], x: number, y: number, w: number, h: number, type: TileType) {
  for (let ty = y; ty < y + h; ty++) {
    for (let tx = x; tx < x + w; tx++) {
      if (ty > 0 && ty < tiles.length - 1 && tx > 0 && tx < tiles[0].length - 1) {
        tiles[ty][tx] = type;
      }
    }
  }
}

export function generateFloor(floorNum: number, difficulty: 'normal' | 'hard' | 'nightmare' = 'hard'): GeneratedFloor {
  const width = 64;
  const height = 48;
  const tileSize = 16;

  // Palette shifts every 10 floors; Architecture shifts every 20 floors!
  const paletteIndex = Math.floor((floorNum - 1) / 10) % FLOOR_PALETTES.length;
  const palette = FLOOR_PALETTES[paletteIndex];
  const archTier = Math.floor((floorNum - 1) / 20) % 3;
  const isBossFloor = floorNum % 10 === 0;

  const tiles: TileType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => 0 as TileType)
  );

  const flipX = floorNum % 2 === 0;
  let mainRoom: RoomDef;
  let alcoveNW: RoomDef;
  let alcoveNE: RoomDef;
  let alcoveSW: RoomDef;
  let alcoveSE: RoomDef;
  let storageRoom: RoomDef;
  let exitRoom: RoomDef;
  let spawn: Vec2;
  let hatch: Vec2;

  if (archTier === 0) {
    // ARCH TIER 0 (Floors 1-20): Chamfered Foundry Reactor & Angled Wings
    mainRoom = { id: 'main', kind: 'MAIN', name: 'Main Boiler Hall', x: 19, y: 14, w: 26, h: 20 };
    carveOctagon(tiles, 32, 24, 13, 10, 5, 1);

    // Asymmetric grated catwalk cross inside reactor floor
    setTileRect(tiles, 30, 16, 4, 16, 2);
    setTileRect(tiles, 21, 22, 22, 4, 2);

    // Industrial boiler obstacles (tile = 4) & concrete pillars (not crowded on boss floors)
    if (isBossFloor) {
      setTileRect(tiles, 24, 18, 2, 2, 4);
      setTileRect(tiles, 38, 18, 2, 2, 4);
      setTileRect(tiles, 24, 28, 2, 2, 4);
      setTileRect(tiles, 38, 28, 2, 2, 4);
    } else {
      setTileRect(tiles, 25, 18, 3, 2, 4);
      setTileRect(tiles, 36, 18, 2, 2, 0);
      setTileRect(tiles, 26, 28, 2, 2, 0);
      setTileRect(tiles, 36, 27, 3, 2, 4);
    }

    // Irregular offset side chambers
    alcoveNW = { id: 'alcove_nw', kind: 'ALCOVE', name: 'Damp Cell', alcoveIndex: 0, x: 17, y: 4, w: 11, h: 8 };
    alcoveNE = { id: 'alcove_ne', kind: 'ALCOVE', name: 'Rust Alcove', alcoveIndex: 1, x: 35, y: 5, w: 12, h: 7 };
    alcoveSW = { id: 'alcove_sw', kind: 'ALCOVE', name: 'Dark Recess', alcoveIndex: 2, x: 16, y: 36, w: 12, h: 8 };
    alcoveSE = { id: 'alcove_se', kind: 'ALCOVE', name: 'Furnace Nook', alcoveIndex: 3, x: 35, y: 36, w: 11, h: 8 };

    carveOctagon(tiles, 22, 8, 5, 4, 2, 1);
    carveRect(tiles, alcoveNE.x, alcoveNE.y, alcoveNE.w, alcoveNE.h, 1);
    carveRect(tiles, alcoveSW.x, alcoveSW.y, alcoveSW.w, alcoveSW.h, 1);
    carveOctagon(tiles, 40, 40, 5, 4, 2, 1);

    // Diagonal stepped passages into main reactor
    carveRect(tiles, 22, 11, 4, 5, 1);
    carveRect(tiles, 38, 11, 4, 5, 1);
    carveRect(tiles, 21, 32, 4, 5, 1);
    carveRect(tiles, 37, 32, 4, 5, 1);

    const storageX = flipX ? 49 : 4;
    const exitX = flipX ? 4 : 49;
    storageRoom = { id: 'storage', kind: 'STORAGE', name: 'Supply Storage', x: storageX, y: 16, w: 11, h: 14 };
    exitRoom = { id: 'exit', kind: 'EXIT', name: 'Descent Shaft', x: exitX, y: 18, w: 11, h: 12 };

    carveRect(tiles, storageRoom.x, storageRoom.y, storageRoom.w, storageRoom.h, 2);
    carveOctagon(tiles, exitRoom.x + 5, exitRoom.y + 6, 5, 6, 2, 1);

    // Wide stepped corridors
    carveRect(tiles, 15, 21, 6, 4, 1);
    carveRect(tiles, 43, 22, 7, 4, 1);

    // Puddles along drainage trenches
    setTileRect(tiles, 28, 18, 2, 2, 3);
    setTileRect(tiles, 34, 27, 3, 2, 3);
    setTileRect(tiles, 20, 6, 2, 2, 3);
    setTileRect(tiles, 40, 39, 2, 2, 3);

    spawn = { x: (flipX ? 38 : 26) * tileSize, y: 24 * tileSize };
    hatch = { x: (exitRoom.x + exitRoom.w / 2) * tileSize, y: (exitRoom.y + exitRoom.h / 2) * tileSize };
  } else if (archTier === 1) {
    // ARCH TIER 1 (Floors 21-40): Twin Turbine Halls & Central Sump Bridges
    mainRoom = { id: 'main', kind: 'MAIN', name: 'Main Boiler Hall', x: 14, y: 15, w: 36, h: 18 };
    carveRect(tiles, 14, 15, 15, 18, 1); // West turbine wing
    carveRect(tiles, 35, 15, 15, 18, 1); // East turbine wing
    // Twin grated bridges linking West and East turbine wings
    carveRect(tiles, 28, 18, 8, 4, 2);
    carveRect(tiles, 28, 26, 8, 4, 2);
    // Machinery turbines inside wings
    setTileRect(tiles, 19, 21, 3, 4, 4);
    setTileRect(tiles, 42, 21, 3, 4, 4);
    setTileRect(tiles, 24, 17, 2, 2, 3);
    setTileRect(tiles, 39, 28, 2, 2, 3);

    alcoveNW = { id: 'alcove_nw', kind: 'ALCOVE', name: 'Damp Cell', alcoveIndex: 0, x: 16, y: 4, w: 11, h: 8 };
    alcoveNE = { id: 'alcove_ne', kind: 'ALCOVE', name: 'Rust Alcove', alcoveIndex: 1, x: 37, y: 4, w: 11, h: 8 };
    alcoveSW = { id: 'alcove_sw', kind: 'ALCOVE', name: 'Dark Recess', alcoveIndex: 2, x: 16, y: 36, w: 11, h: 8 };
    alcoveSE = { id: 'alcove_se', kind: 'ALCOVE', name: 'Furnace Nook', alcoveIndex: 3, x: 37, y: 36, w: 11, h: 8 };
    for (const r of [alcoveNW, alcoveNE, alcoveSW, alcoveSE]) {
      carveRect(tiles, r.x, r.y, r.w, r.h, 1);
    }
    carveRect(tiles, 19, 12, 4, 3, 1);
    carveRect(tiles, 41, 12, 4, 3, 1);
    carveRect(tiles, 19, 33, 4, 3, 1);
    carveRect(tiles, 41, 33, 4, 3, 1);

    const storageX = flipX ? 51 : 3;
    const exitX = flipX ? 3 : 51;
    storageRoom = { id: 'storage', kind: 'STORAGE', name: 'Supply Storage', x: storageX, y: 17, w: 10, h: 14 };
    exitRoom = { id: 'exit', kind: 'EXIT', name: 'Descent Shaft', x: exitX, y: 18, w: 10, h: 12 };
    carveRect(tiles, storageRoom.x, storageRoom.y, storageRoom.w, storageRoom.h, 2);
    carveRect(tiles, exitRoom.x, exitRoom.y, exitRoom.w, exitRoom.h, 1);
    carveRect(tiles, 12, 22, 3, 4, 1);
    carveRect(tiles, 49, 22, 3, 4, 1);

    spawn = { x: (flipX ? 42 : 22) * tileSize, y: 24 * tileSize };
    hatch = { x: (exitRoom.x + exitRoom.w / 2) * tileSize, y: (exitRoom.y + exitRoom.h / 2) * tileSize };
  } else {
    // ARCH TIER 2 (Floors 41-60+): Ringed Sump Arena with Central Island & Outer Loop
    mainRoom = { id: 'main', kind: 'MAIN', name: 'Main Boiler Hall', x: 16, y: 12, w: 32, h: 24 };
    carveOctagon(tiles, 32, 24, 16, 12, 6, 1);
    // Central boiler island creating dynamic ring combat
    setTileRect(tiles, 29, 21, 6, 6, 4);
    setTileRect(tiles, 22, 19, 2, 2, 3);
    setTileRect(tiles, 40, 27, 2, 2, 3);

    alcoveNW = { id: 'alcove_nw', kind: 'ALCOVE', name: 'Damp Cell', alcoveIndex: 0, x: 18, y: 3, w: 10, h: 7 };
    alcoveNE = { id: 'alcove_ne', kind: 'ALCOVE', name: 'Rust Alcove', alcoveIndex: 1, x: 36, y: 3, w: 10, h: 7 };
    alcoveSW = { id: 'alcove_sw', kind: 'ALCOVE', name: 'Dark Recess', alcoveIndex: 2, x: 18, y: 38, w: 10, h: 7 };
    alcoveSE = { id: 'alcove_se', kind: 'ALCOVE', name: 'Furnace Nook', alcoveIndex: 3, x: 36, y: 38, w: 10, h: 7 };
    for (const r of [alcoveNW, alcoveNE, alcoveSW, alcoveSE]) {
      carveOctagon(tiles, r.x + 5, r.y + 3, 5, 4, 2, 1);
    }
    carveRect(tiles, 21, 9, 4, 5, 1);
    carveRect(tiles, 39, 9, 4, 5, 1);
    carveRect(tiles, 21, 34, 4, 5, 1);
    carveRect(tiles, 39, 34, 4, 5, 1);

    const storageX = flipX ? 51 : 3;
    const exitX = flipX ? 3 : 51;
    storageRoom = { id: 'storage', kind: 'STORAGE', name: 'Supply Storage', x: storageX, y: 17, w: 10, h: 14 };
    exitRoom = { id: 'exit', kind: 'EXIT', name: 'Descent Shaft', x: exitX, y: 18, w: 10, h: 12 };
    carveRect(tiles, storageRoom.x, storageRoom.y, storageRoom.w, storageRoom.h, 2);
    carveOctagon(tiles, exitRoom.x + 5, exitRoom.y + 6, 5, 6, 2, 1);
    carveRect(tiles, 12, 22, 6, 4, 1);
    carveRect(tiles, 46, 22, 6, 4, 1);

    spawn = { x: (flipX ? 41 : 23) * tileSize, y: 24 * tileSize };
    hatch = { x: (exitRoom.x + exitRoom.w / 2) * tileSize, y: (exitRoom.y + exitRoom.h / 2) * tileSize };
  }

  const rooms: RoomDef[] = [mainRoom, alcoveNW, alcoveNE, alcoveSW, alcoveSE, storageRoom, exitRoom];

  const wallLamps: WallSparkLamp[] = [
    { x: (mainRoom.x + 4) * tileSize, y: (mainRoom.y + 2) * tileSize, phase: 0.4, dead: false },
    { x: (mainRoom.x + mainRoom.w - 4) * tileSize, y: (mainRoom.y + mainRoom.h - 2) * tileSize, phase: 2.1, dead: false },
    { x: hatch.x, y: (exitRoom.y + 2) * tileSize, phase: 1.3, dead: false },
  ];

  // Crates & lootables
  const crates: CrateEntity[] = [];
  let crateCounter = 0;
  const addCrate = (tx: number, ty: number, kind: 'crate' | 'barrel' | 'locker', hasLoot: boolean) => {
    const tVal = tiles[ty]?.[tx] ?? 0;
    if (tVal === 0 || tVal === 4) return;
    crates.push({
      id: `crate_${crateCounter++}`,
      x: (tx + 0.5) * tileSize,
      y: (ty + 0.5) * tileSize,
      hp: kind === 'locker' ? 35 : 20,
      kind,
      broken: false,
      hasLoot,
    });
  };

  addCrate(storageRoom.x + 2, storageRoom.y + 2, 'crate', true);
  addCrate(storageRoom.x + 3, storageRoom.y + 2, 'barrel', false);
  addCrate(storageRoom.x + 2, storageRoom.y + storageRoom.h - 3, 'crate', true);
  addCrate(storageRoom.x + storageRoom.w - 3, storageRoom.y + 2, 'barrel', true);
  addCrate(storageRoom.x + Math.floor(storageRoom.w / 2), storageRoom.y + Math.floor(storageRoom.h / 2), 'locker', true);

  addCrate(alcoveNW.x + 3, alcoveNW.y + 3, 'crate', true);
  addCrate(alcoveNE.x + alcoveNE.w - 4, alcoveNE.y + 3, 'barrel', true);
  addCrate(alcoveSW.x + 3, alcoveSW.y + alcoveSW.h - 3, 'locker', true);
  addCrate(alcoveSE.x + alcoveSE.w - 4, alcoveSE.y + alcoveSE.h - 3, 'crate', false);

  // Enemies
  const enemies: EnemyEntity[] = [];
  let enemyCounter = 0;

  const diffHpMult = difficulty === 'nightmare' ? 1.55 : difficulty === 'hard' ? 1.25 : 1.0;
  const diffFloorSlope = difficulty === 'nightmare' ? 0.56 : difficulty === 'hard' ? 0.42 : 0.30;

  const spawnEnemy = (kind: EnemyKind, room: RoomDef, offsetX = 0, offsetY = 0) => {
    const scale = (1 + (floorNum - 1) * diffFloorSlope) * diffHpMult;
    const bossTier = Math.max(0, Math.floor(floorNum / 10) - 1);
    const bossScale = diffHpMult * (1 + bossTier * 0.72);
    const statsByKind: Record<EnemyKind, { name: string; hp: number; radius: number }> = {
      stalker: { name: 'Cleaver Stalker', hp: Math.round(220 * scale), radius: 6.5 },
      brute: { name: 'Pipe Brute', hp: Math.round(410 * scale), radius: 8.5 },
      duelist: { name: 'Shadow Duelist', hp: Math.round(285 * scale), radius: 6.5 },
      warden: { name: 'Dump Warden', hp: Math.round(640 * scale), radius: 9.5 },
      boss: { name: 'Overlord of the Dump', hp: Math.round(1850 * bossScale), radius: 13 },
    };
    const spec = statsByKind[kind];
    let ex = (room.x + room.w / 2 + offsetX) * tileSize;
    let ey = (room.y + room.h / 2 + offsetY) * tileSize;
    // Nudge off solid tiles if needed
    const tx = Math.floor(ex / tileSize);
    const ty = Math.floor(ey / tileSize);
    if (tiles[ty]?.[tx] === 0 || tiles[ty]?.[tx] === 4) {
      ex = (room.x + room.w / 2) * tileSize;
      ey = (room.y + 3) * tileSize;
    }

    enemies.push({
      id: `enemy_${floorNum}_${enemyCounter++}`,
      kind,
      name: spec.name,
      isBoss: kind === 'boss',
      x: ex,
      y: ey,
      vx: 0,
      vy: 0,
      radius: spec.radius,
      hp: spec.hp,
      maxHp: spec.hp,
      angle: Math.random() * Math.PI * 2,
      state: kind === 'boss' ? 'CHASE' : 'PATROL',
      stateTimer: 0.4 + Math.random() * 0.6,
      attackCooldown: 0.55 + Math.random() * 0.35,
      evadeCooldown: 1.3 + Math.random() * 1.2,
      strafeDir: Math.random() < 0.5 ? -1 : 1,
      comboCount: 0,
      hitFlash: 0,
      bleedTimer: 0,
      bleedDps: 0,
      walkPhase: Math.random() * Math.PI * 2,
      alerted: kind === 'boss',
      parriedWindow: false,
      hasDealtDamageThisSwing: false,
      homeRoomId: room.id,
    });
  };

  if (isBossFloor) {
    // Every 10th floor: massive Overlord Boss (plus elite vanguard on higher difficulties / deep floors)
    spawnEnemy('boss', mainRoom, flipX ? -4 : 4, 0);
    if (difficulty === 'nightmare' || floorNum >= 20) {
      spawnEnemy('duelist', alcoveNW, 0, 0);
      if (difficulty === 'nightmare' && floorNum >= 20) {
        spawnEnemy('warden', alcoveSE, 0, 0);
      }
    }
  } else if (floorNum === 1) {
    spawnEnemy('stalker', alcoveNW, 0, 0);
    spawnEnemy('stalker', alcoveNE, 0, 0);
    spawnEnemy('brute', alcoveSE, 0, 0);
    spawnEnemy('duelist', exitRoom, 0, -1.5);
  } else {
    const enemyRooms = [alcoveNW, alcoveNE, alcoveSW, alcoveSE, storageRoom, mainRoom];
    const diffExtra = difficulty === 'nightmare' ? 2 : difficulty === 'hard' ? 1 : 0;
    const totalCount = Math.min(11, 4 + Math.floor(floorNum * 0.85) + diffExtra);
    const pool: EnemyKind[] =
      floorNum >= 4
        ? ['duelist', 'brute', 'warden', 'stalker', 'duelist', 'brute']
        : ['stalker', 'duelist', 'brute', 'duelist', 'stalker'];
    for (let i = 0; i < totalCount; i++) {
      const r = enemyRooms[i % enemyRooms.length];
      const kind = pool[(i + floorNum) % pool.length];
      spawnEnemy(kind, r, (Math.random() - 0.5) * 2.2, (Math.random() - 0.5) * 2.2);
    }
    if (floorNum >= 3 || floorNum % 2 === 0) {
      spawnEnemy('warden', exitRoom, 0, 0);
    } else {
      spawnEnemy('duelist', exitRoom, 0, 0);
    }
  }

  return {
    map: {
      width,
      height,
      tileSize,
      tiles,
      rooms,
      spawn,
      hatch,
      hatchUnlocked: false,
      wallLamps,
      palette,
      archTier,
    },
    crates,
    enemies,
  };
}
