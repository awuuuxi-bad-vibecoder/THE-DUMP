import { CrateEntity, EnemyEntity, FloorMap, LootDrop, PlayerEntity, ProjectileSpark } from './types';

function hash2D(x: number, y: number): number {
  let n = x * 374761393 + y * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

export function drawBasementTile(
  ctx: CanvasRenderingContext2D,
  map: FloorMap,
  tx: number,
  ty: number,
  time: number,
  noTextures = false
) {
  const ts = map.tileSize;
  const px = tx * ts;
  const py = ty * ts;
  const tile = map.tiles[ty][tx];
  const h = hash2D(tx, ty);
  const pal = map.palette;

  if (noTextures) {
    if (tile === 0) {
      const below = map.tiles[ty + 1]?.[tx] ?? 0;
      ctx.fillStyle = below !== 0 ? pal.wallFace : pal.wallVoid;
    } else if (tile === 4) {
      ctx.fillStyle = pal.machineryTrim;
    } else if (tile === 2) {
      ctx.fillStyle = pal.machinery;
    } else if (tile === 3) {
      ctx.fillStyle = pal.puddle;
    } else {
      ctx.fillStyle = pal.floorA;
    }
    ctx.fillRect(px, py, ts, ts);
    return;
  }

  if (tile === 0) {
    const below = map.tiles[ty + 1]?.[tx] ?? 0;
    const above = map.tiles[ty - 1]?.[tx] ?? 0;
    if (below !== 0) {
      ctx.fillStyle = pal.wallFace;
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = pal.wallBrick;
      ctx.fillRect(px, py + 5, ts, 1);
      ctx.fillRect(px, py + 11, ts, 1);
      ctx.fillRect(px + (ty % 2 === 0 ? 4 : 10), py, 1, 5);
      ctx.fillRect(px + (ty % 2 === 0 ? 11 : 3), py + 6, 1, 5);
      ctx.fillStyle = pal.wallVoid;
      ctx.fillRect(px, py + ts - 2, ts, 2);
      if (h > 0.72) {
        ctx.fillStyle = pal.machinery;
        ctx.fillRect(px + Math.floor(h * 10), py + 2, 2, 7);
      }
      ctx.fillStyle = pal.wallTop;
      ctx.fillRect(px, py, ts, 1);
    } else if (above !== 0) {
      ctx.fillStyle = pal.wallVoid;
      ctx.fillRect(px, py, ts, ts);
      ctx.fillStyle = pal.wallTop;
      ctx.fillRect(px, py, ts, 1);
    } else {
      ctx.fillStyle = pal.wallVoid;
      ctx.fillRect(px, py, ts, ts);
    }
    return;
  }

  if (tile === 4) {
    // Solid Industrial Boiler / Machinery Obstacle
    ctx.fillStyle = pal.wallVoid;
    ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = pal.machinery;
    ctx.fillRect(px + 1, py + 1, ts - 2, ts - 2);
    // Copper/steel pipes & vents
    ctx.fillStyle = pal.machineryTrim;
    ctx.fillRect(px + 2, py + 2, ts - 4, 3);
    ctx.fillRect(px + 2, py + ts - 5, ts - 4, 2);
    // Dark radiator slits
    ctx.fillStyle = '#0c0b0e';
    ctx.fillRect(px + 3, py + 6, 2, 4);
    ctx.fillRect(px + 7, py + 6, 2, 4);
    ctx.fillRect(px + 11, py + 6, 2, 4);
    // Gauge dot
    ctx.fillStyle = h > 0.5 ? '#ffaa33' : '#55c2d9';
    ctx.fillRect(px + 12, py + 3, 2, 2);
    return;
  }

  if (tile === 2) {
    // Industrial Metal Grate / Catwalk
    ctx.fillStyle = pal.machinery;
    ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = pal.seam;
    ctx.fillRect(px, py + 3, ts, 1);
    ctx.fillRect(px, py + 7, ts, 1);
    ctx.fillRect(px, py + 11, ts, 1);
    ctx.fillRect(px, py + 15, ts, 1);
    if (h > 0.45) {
      ctx.fillStyle = pal.machineryTrim;
      ctx.fillRect(px + 2, py + 1, 4, 1);
      ctx.fillRect(px + 9, py + 9, 4, 1);
    }
  } else {
    const shade = h > 0.65 ? pal.floorB : h < 0.25 ? pal.floorC : pal.floorA;
    ctx.fillStyle = shade;
    ctx.fillRect(px, py, ts, ts);

    ctx.fillStyle = pal.seam;
    ctx.fillRect(px, py, ts, 1);
    ctx.fillRect(px, py, 1, ts);

    if (h > 0.82) {
      ctx.fillStyle = pal.wallVoid;
      ctx.fillRect(px + 4, py + 5, 3, 1);
      ctx.fillRect(px + 7, py + 6, 2, 1);
      ctx.fillRect(px + 9, py + 7, 1, 2);
    } else if (h < 0.14) {
      ctx.fillStyle = pal.wallFace;
      ctx.fillRect(px + 9, py + 9, 3, 2);
    }

    if (tile === 3) {
      ctx.fillStyle = pal.puddle;
      ctx.fillRect(px + 1, py + 2, ts - 2, ts - 4);
      ctx.fillStyle = pal.puddleLight;
      ctx.fillRect(px + 3, py + 4, ts - 6, ts - 8);
      if (Math.sin(time * 2.5 + tx * 1.7 + ty) > 0.65) {
        ctx.fillStyle = '#5c7e94';
        ctx.fillRect(px + 5, py + 6, 3, 1);
      }
    }
  }

  // Contact shadow below north walls / boilers
  const above = map.tiles[ty - 1]?.[tx] ?? 0;
  if (above === 0 || above === 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(px, py, ts, 3);
  }
}

export function drawHatch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  unlocked: boolean,
  time: number
) {
  const rx = Math.round(x - 14);
  const ry = Math.round(y - 14);

  ctx.fillStyle = '#1a191d';
  ctx.fillRect(rx - 2, ry - 2, 32, 32);
  ctx.fillStyle = '#3a3531';
  ctx.fillRect(rx, ry, 28, 28);

  if (unlocked) {
    ctx.fillStyle = '#070709';
    ctx.fillRect(rx + 3, ry + 3, 22, 22);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#2b2520' : '#1f1b17';
      ctx.fillRect(rx + 5, ry + 5 + i * 5, 18, 2);
    }
    const pulse = Math.sin(time * 5) > 0;
    ctx.fillStyle = pulse ? '#ffaa33' : '#9c5b14';
    ctx.fillRect(rx + 1, ry + 1, 3, 3);
    ctx.fillRect(rx + 24, ry + 1, 3, 3);
  } else {
    ctx.fillStyle = '#2a2626';
    ctx.fillRect(rx + 2, ry + 2, 11, 24);
    ctx.fillRect(rx + 15, ry + 2, 11, 24);
    ctx.fillStyle = '#181515';
    ctx.fillRect(rx + 13, ry + 2, 2, 24);
    ctx.fillStyle = Math.sin(time * 3) > 0 ? '#cc2b2b' : '#5e1414';
    ctx.fillRect(rx + 12, ry + 12, 4, 4);
  }
}

export function drawCrate(ctx: CanvasRenderingContext2D, crate: CrateEntity) {
  if (crate.broken) return;
  const cx = Math.round(crate.x - 6);
  const cy = Math.round(crate.y - 6);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(cx - 1, cy + 9, 14, 5);

  if (crate.kind === 'crate') {
    ctx.fillStyle = '#4a3220';
    ctx.fillRect(cx, cy, 12, 12);
    ctx.fillStyle = '#69472e';
    ctx.fillRect(cx + 1, cy + 1, 10, 10);
    ctx.fillStyle = '#332114';
    ctx.fillRect(cx + 1, cy + 5, 10, 1);
    ctx.fillRect(cx + 5, cy + 1, 1, 10);
    ctx.fillStyle = '#7d573a';
    ctx.fillRect(cx + 1, cy + 1, 10, 1);
  } else if (crate.kind === 'barrel') {
    ctx.fillStyle = '#302320';
    ctx.fillRect(cx + 1, cy, 10, 12);
    ctx.fillStyle = '#5e2c24';
    ctx.fillRect(cx + 2, cy + 1, 8, 10);
    ctx.fillStyle = '#3c3b42';
    ctx.fillRect(cx + 1, cy + 3, 10, 2);
    ctx.fillRect(cx + 1, cy + 8, 10, 2);
  } else {
    ctx.fillStyle = '#252b30';
    ctx.fillRect(cx - 1, cy - 1, 14, 14);
    ctx.fillStyle = '#3b444b';
    ctx.fillRect(cx, cy, 12, 12);
    ctx.fillStyle = '#58646e';
    ctx.fillRect(cx, cy, 12, 2);
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(cx + 5, cy + 5, 2, 3);
  }
}

export function drawLootDrop(ctx: CanvasRenderingContext2D, drop: LootDrop, time: number) {
  const bob = Math.round(Math.sin(time * 5 + drop.bobPhase) * 1.5);
  const dx = Math.round(drop.x);
  const dy = Math.round(drop.y + bob);

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(dx - 4, Math.round(drop.y) + 4, 8, 3);

  if (drop.kind === 'MEDKIT') {
    ctx.fillStyle = '#8c1d24';
    ctx.fillRect(dx - 4, dy - 3, 8, 6);
    ctx.fillStyle = '#e8ded1';
    ctx.fillRect(dx - 3, dy - 2, 6, 4);
    ctx.fillStyle = '#d93232';
    ctx.fillRect(dx - 1, dy - 2, 2, 4);
    ctx.fillRect(dx - 2, dy - 1, 4, 2);
  } else if (drop.kind === 'OIL') {
    ctx.fillStyle = '#5c4119';
    ctx.fillRect(dx - 3, dy - 4, 6, 8);
    ctx.fillStyle = '#e09d36';
    ctx.fillRect(dx - 2, dy - 2, 4, 5);
    ctx.fillStyle = '#ffd27d';
    ctx.fillRect(dx - 1, dy - 4, 2, 2);
  } else if (drop.kind === 'SKILL_BOOK') {
    ctx.fillStyle = '#1d1429';
    ctx.fillRect(dx - 5, dy - 6, 10, 12);
    ctx.fillStyle = '#382552';
    ctx.fillRect(dx - 4, dy - 5, 8, 10);
    ctx.fillStyle = '#241736';
    ctx.fillRect(dx - 4, dy - 5, 2, 10);
    ctx.fillStyle =
      drop.skillId === 'whirlwind_rend' || drop.skillId === 'heavy_breaker'
        ? '#ff9933'
        : drop.skillId === 'twin_fangs'
          ? '#ff4f79'
          : drop.skillId === 'spark_nova_slash'
            ? '#ffe05c'
            : '#6ce2ff';
    ctx.fillRect(dx - 1, dy - 2, 3, 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx, dy - 1, 1, 2);
  } else {
    ctx.fillStyle = '#241b12';
    ctx.fillRect(dx - 5, dy - 5, 10, 10);
    ctx.fillStyle = '#d49a35';
    ctx.fillRect(dx - 4, dy - 4, 8, 8);
    ctx.fillStyle = '#fff0a8';
    ctx.fillRect(dx - 2, dy - 2, 4, 4);
  }
}

export function drawProjectileSpark(ctx: CanvasRenderingContext2D, sp: ProjectileSpark) {
  const sx = Math.round(sp.x);
  const sy = Math.round(sp.y);
  ctx.fillStyle = sp.color;
  ctx.fillRect(sx - 2, sy - 2, 4, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(sx - 1, sy - 1, 2, 2);
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: PlayerEntity, time = 0, isAfterImage = false) {
  const px = Math.round(p.x);
  const breath = isAfterImage ? 0 : Math.round(Math.sin(time * 4.5) * 0.6);
  const py = Math.round(p.y) + breath;
  const cos = Math.cos(p.aimAngle);
  const sin = Math.sin(p.aimAngle);

  if (!isAfterImage) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(px - 6, Math.round(p.y) + 4, 12, 4);

    const aimX = Math.round(p.x + cos * 15);
    const aimY = Math.round(p.y + sin * 15);
    ctx.fillStyle = 'rgba(255, 214, 130, 0.72)';
    ctx.fillRect(aimX - 1, aimY - 1, 2, 2);
    ctx.fillStyle = 'rgba(255, 214, 130, 0.35)';
    ctx.fillRect(Math.round(p.x + cos * 18), Math.round(p.y + sin * 18), 1, 1);
  }

  const walkOffset = Math.round(Math.sin(p.walkPhase) * 1.5);

  ctx.fillStyle = isAfterImage ? '#4c88b0' : '#1b1d24';
  ctx.fillRect(px - 3, py + 3 + walkOffset, 2, 3);
  ctx.fillRect(px + 1, py + 3 - walkOffset, 2, 3);

  if (p.hitFlash > 0) {
    ctx.fillStyle = '#ffffff';
  } else if (isAfterImage) {
    ctx.fillStyle = 'rgba(110, 195, 240, 0.45)';
  } else {
    ctx.fillStyle = '#333b42';
  }
  ctx.fillRect(px - 4, py - 4, 8, 8);

  if (!isAfterImage && p.hitFlash <= 0) {
    ctx.fillStyle = '#4c5661';
    ctx.fillRect(px - 4, py - 4, 8, 2);
  }

  ctx.fillStyle = p.hitFlash > 0 ? '#ffffff' : isAfterImage ? 'rgba(130,210,255,0.5)' : '#24272d';
  ctx.fillRect(px - 3, py - 7, 6, 4);

  if (isAfterImage) return;

  const eyeX = px + Math.round(cos * 2);
  const eyeY = py - 5 + Math.round(sin * 1.5);
  ctx.fillStyle = '#d6b896';
  ctx.fillRect(eyeX - 1, eyeY, 2, 2);

  const perpX = -sin;
  const perpY = cos;
  const lampX = Math.round(px + cos * 6 + perpX * 4);
  const lampY = Math.round(py - 1 + sin * 6 + perpY * 4);
  ctx.fillStyle = '#8a6220';
  ctx.fillRect(lampX - 1, lampY - 1, 3, 3);
  ctx.fillStyle = '#ffe28a';
  ctx.fillRect(lampX, lampY, 2, 2);

  if (p.parryTimer > 0) {
    const gx = Math.round(px + cos * 8);
    const gy = Math.round(py - 1 + sin * 8);
    ctx.fillStyle = '#8ef0ff';
    ctx.fillRect(gx - Math.round(perpX * 5) - 1, gy - Math.round(perpY * 5) - 1, 3, 3);
    ctx.fillRect(gx - 1, gy - 1, 3, 3);
    ctx.fillRect(gx + Math.round(perpX * 5) - 1, gy + Math.round(perpY * 5) - 1, 3, 3);
  } else {
    const bladeBaseX = px + cos * 5 - perpX * 4;
    const bladeBaseY = py - 1 + sin * 5 - perpY * 4;
    const swingTilt = p.attackTimer > 0 ? p.swingDir * 0.9 : 0;
    const bCos = Math.cos(p.aimAngle + swingTilt);
    const bSin = Math.sin(p.aimAngle + swingTilt);
    ctx.fillStyle = '#b9c2cc';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(Math.round(bladeBaseX + bCos * i), Math.round(bladeBaseY + bSin * i), 2, 2);
    }
  }
}

export function drawEnemy(ctx: CanvasRenderingContext2D, e: EnemyEntity, time: number) {
  const ex = Math.round(e.x);
  const breath = Math.round(Math.sin(time * 4 + e.walkPhase) * 0.6);
  const ey = Math.round(e.y) + breath;
  const cos = Math.cos(e.angle);
  const sin = Math.sin(e.angle);
  const walk = Math.round(Math.sin(e.walkPhase) * 1.5);

  if (e.kind === 'boss') {
    // Towering Overlord Boss Pixel Sprite (16x16 armored juggernaut + glowing furnace core!)
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(ex - 11, Math.round(e.y) + 7, 22, 6);

    ctx.fillStyle = '#121014';
    ctx.fillRect(ex - 6, ey + 5 + walk, 4, 5);
    ctx.fillRect(ex + 2, ey + 5 - walk, 4, 5);

    const flash = e.hitFlash > 0;
    const staggered = e.state === 'STAGGERED';
    ctx.fillStyle = flash ? '#ffffff' : staggered ? '#4b556b' : '#3a1b1f';
    ctx.fillRect(ex - 8, ey - 7, 16, 13);

    // Shoulder armor plates
    ctx.fillStyle = flash ? '#ffffff' : '#63534c';
    ctx.fillRect(ex - 10, ey - 7, 4, 5);
    ctx.fillRect(ex + 6, ey - 7, 4, 5);

    // Glowing furnace chest core
    ctx.fillStyle = staggered ? '#7ceeff' : Math.sin(time * 9) > 0 ? '#ff6b2b' : '#ffaa33';
    ctx.fillRect(ex - 2, ey - 3, 4, 4);

    // Horned helmet
    ctx.fillStyle = flash ? '#ffffff' : '#1b171b';
    ctx.fillRect(ex - 5, ey - 12, 10, 6);
    ctx.fillStyle = '#8c7e74';
    ctx.fillRect(ex - 7, ey - 14, 2, 4);
    ctx.fillRect(ex + 5, ey - 14, 2, 4);

    // Glowing visor eyes
    ctx.fillStyle = '#ff2e43';
    ctx.fillRect(ex + Math.round(cos * 2) - 2, ey - 10 + Math.round(sin), 4, 2);

    // Giant serrated cleaver weapon
    const wx = Math.round(ex + cos * 13);
    const wy = Math.round(ey - 1 + sin * 13);
    ctx.fillStyle = '#c4ccd4';
    ctx.fillRect(wx - 2, wy - 2, 5, 5);

    if (e.state === 'WINDUP') {
      const pulse = Math.sin(time * 42) > 0;
      ctx.fillStyle = pulse ? '#ff1f3d' : '#ff99a4';
      ctx.fillRect(wx - 6, wy, 13, 1);
      ctx.fillRect(wx, wy - 6, 1, 13);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(wx, wy, 2, 2);
    }

    if (staggered) {
      const sx = ex + Math.round(Math.cos(time * 8) * 8);
      const sy = ey - 17;
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(sx, sy, 2, 2);
      ctx.fillRect(ex - (sx - ex), sy + 1, 2, 2);
    }
    return;
  }

  const isHeavy = e.kind === 'brute' || e.kind === 'warden';
  const w = isHeavy ? 10 : 8;
  const h = isHeavy ? 10 : 8;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(ex - Math.floor(w / 2) - 1, Math.round(e.y) + 4, w + 2, 4);

  ctx.fillStyle = '#151418';
  ctx.fillRect(ex - 3, ey + 3 + walk, 2, 3);
  ctx.fillRect(ex + 1, ey + 3 - walk, 2, 3);

  let bodyColor = '#4a2b2b';
  let trimColor = '#6e3a3a';
  let eyeColor = '#ff4d4d';

  if (e.kind === 'brute') {
    bodyColor = '#3a342e';
    trimColor = '#5e5347';
    eyeColor = '#ff7733';
  } else if (e.kind === 'duelist') {
    bodyColor = '#211c29';
    trimColor = '#7d2038';
    eyeColor = '#ff3864';
  } else if (e.kind === 'warden') {
    bodyColor = '#472124';
    trimColor = '#8c7568';
    eyeColor = '#ffaa2b';
  }

  if (e.hitFlash > 0) {
    bodyColor = '#ffffff';
    trimColor = '#ffffff';
  } else if (e.state === 'STAGGERED') {
    bodyColor = '#525b6e';
  }

  ctx.fillStyle = bodyColor;
  ctx.fillRect(ex - Math.floor(w / 2), ey - Math.floor(h / 2), w, h);
  ctx.fillStyle = trimColor;
  ctx.fillRect(ex - Math.floor(w / 2), ey - Math.floor(h / 2), w, 2);

  ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#1b181c';
  ctx.fillRect(ex - 3, ey - Math.floor(h / 2) - 3, 6, 4);

  ctx.fillStyle = eyeColor;
  ctx.fillRect(ex + Math.round(cos * 2) - 1, ey - Math.floor(h / 2) - 2 + Math.round(sin), 2, 1);

  const wx = Math.round(ex + cos * (isHeavy ? 9 : 7));
  const wy = Math.round(ey - 1 + sin * (isHeavy ? 9 : 7));
  ctx.fillStyle = e.kind === 'brute' ? '#7a7d85' : '#aeb6bf';
  ctx.fillRect(wx - 1, wy - 1, isHeavy ? 4 : 3, isHeavy ? 4 : 3);

  if (e.state === 'WINDUP') {
    const pulse = Math.sin(time * 40) > 0;
    ctx.fillStyle = pulse ? '#ff2a40' : '#ff99a4';
    ctx.fillRect(wx - 4, wy, 9, 1);
    ctx.fillRect(wx, wy - 4, 1, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(wx, wy, 1, 1);
  }

  if (e.state === 'STAGGERED') {
    const sx = ex + Math.round(Math.cos(time * 8) * 5);
    const sy = ey - 10;
    ctx.fillStyle = '#ffe066';
    ctx.fillRect(sx, sy, 2, 2);
    ctx.fillRect(ex - (sx - ex), sy + 1, 2, 2);
  }

  if (e.hp < e.maxHp) {
    const bw = isHeavy ? 14 : 10;
    const bx = ex - Math.floor(bw / 2);
    const by = ey - Math.floor(h / 2) - 6;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 3);
    const fill = Math.max(1, Math.round((e.hp / e.maxHp) * bw));
    ctx.fillStyle = e.state === 'STAGGERED' ? '#f5c542' : '#c92e36';
    ctx.fillRect(bx, by, fill, 1);
  }
}
