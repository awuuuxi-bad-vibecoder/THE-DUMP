import { InputSnapshot } from './types';

export class GamepadManager {
  private prevButtons: boolean[] = [];
  private curButtons: boolean[] = [];
  private prevStickMenuDirY = 0;
  private prevStickMenuDirX = 0;
  private keys = new Set<string>();
  private prevKeys = new Set<string>();
  private mousePos = { x: 0, y: 0 };
  private canvasCenter = { x: 1, y: 1 };
  private mouseDownLeft = false;
  private prevMouseLeft = false;
  private mouseDownRight = false;
  private prevMouseRight = false;
  private mouseDownMiddle = false;
  private prevMouseMiddle = false;
  private mouseMovedRecently = false;
  private lastMouseTime = 0;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
  }

  public destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
  }

  public setCanvasCenter(x: number, y: number) {
    this.canvasCenter.x = x;
    this.canvasCenter.y = y;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Tab') {
      e.preventDefault();
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mousePos.x = e.clientX;
    this.mousePos.y = e.clientY;
    this.mouseMovedRecently = true;
    this.lastMouseTime = performance.now();
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDownLeft = true;
    if (e.button === 1) this.mouseDownMiddle = true;
    if (e.button === 2) this.mouseDownRight = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.mouseDownLeft = false;
    if (e.button === 1) this.mouseDownMiddle = false;
    if (e.button === 2) this.mouseDownRight = false;
  };

  private onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  private getActiveGamepad(): Gamepad | null {
    try {
      if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
      const pads = navigator.getGamepads();
      if (!pads) return null;
      for (let i = 0; i < pads.length; i++) {
        const p = pads[i];
        if (p && p.connected) return p;
      }
    } catch {
      // ignore browser gamepad permissions/disconnection quirks
    }
    return null;
  }

  public rumble(strong: number, weak: number, durationMs: number) {
    const pad = this.getActiveGamepad();
    if (!pad) return;
    const actuator = pad.vibrationActuator as
      | (GamepadHapticActuator & {
          playEffect?: (
            type: string,
            params: { startDelay: number; duration: number; weakMagnitude: number; strongMagnitude: number }
          ) => Promise<void>;
        })
      | undefined;
    if (actuator && typeof actuator.playEffect === 'function') {
      actuator
        .playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1, Math.max(0, weak)),
          strongMagnitude: Math.min(1, Math.max(0, strong)),
        })
        .catch(() => {});
    }
  }

  private applyDeadzone(x: number, y: number, deadzone = 0.16): { x: number; y: number } {
    const mag = Math.hypot(x, y);
    if (mag < deadzone) return { x: 0, y: 0 };
    const norm = Math.min(1, (mag - deadzone) / (1 - deadzone));
    return { x: (x / mag) * norm, y: (y / mag) * norm };
  }

  private keyJustPressed(code: string): boolean {
    return this.keys.has(code) && !this.prevKeys.has(code);
  }

  public poll(): InputSnapshot {
    const pad = this.getActiveGamepad();

    let moveX = 0;
    let moveY = 0;
    let aimX = 0;
    let aimY = 0;
    let hasAimInput = false;

    let attackR1Pressed = false;
    let attackR2Pressed = false;
    let parryPressed = false;
    let dashPressed = false;
    let interactPressed = false;
    let inventoryPressed = false;
    let pausePressed = false;

    let menuUp = false;
    let menuDown = false;
    let menuLeft = false;
    let menuRight = false;
    let menuConfirm = false;
    let menuBack = false;
    let menuSquare = false;
    let menuR1 = false;
    let menuL1 = false;
    let menuR2 = false;

    if (pad) {
      const left = this.applyDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0, 0.17);
      const right = this.applyDeadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0, 0.19);
      moveX = left.x;
      moveY = left.y;

      if (Math.hypot(right.x, right.y) > 0.05) {
        aimX = right.x;
        aimY = right.y;
        hasAimInput = true;
      }

      const rawButtons = pad.buttons;
      const len = rawButtons.length;
      if (this.curButtons.length !== len) this.curButtons.length = len;
      if (this.prevButtons.length !== len) this.prevButtons.length = len;
      for (let i = 0; i < len; i++) {
        const btn = rawButtons[i];
        this.curButtons[i] = Boolean(btn && (btn.pressed || btn.value > 0.5));
      }

      const just = (idx: number) => idx < len && this.curButtons[idx] && !this.prevButtons[idx];

      // PS/Xbox standard mapping:
      // 0: Cross/A, 1: Circle/B, 2: Square/X, 3: Triangle/Y
      // 4: L1/LB, 5: R1/RB, 6: L2/LT, 7: R2/RT, 8: Share/View, 9: Options/Menu, 17: Touchpad
      attackR2Pressed = just(7) || just(2);
      attackR1Pressed = just(5);
      parryPressed = just(4) || just(1) || just(6);
      dashPressed = just(0);
      interactPressed = just(3);
      inventoryPressed = just(17) || just(8);
      pausePressed = just(9);

      menuUp = just(12);
      menuDown = just(13);
      menuLeft = just(14);
      menuRight = just(15);
      menuConfirm = just(0);
      menuBack = just(1);
      menuSquare = just(2);
      menuL1 = just(4);
      menuR1 = just(5);
      menuR2 = just(7);

      const stickY = left.y < -0.55 ? -1 : left.y > 0.55 ? 1 : 0;
      if (stickY !== 0 && this.prevStickMenuDirY === 0) {
        if (stickY === -1) menuUp = true;
        if (stickY === 1) menuDown = true;
      }
      this.prevStickMenuDirY = stickY;

      const stickX = left.x < -0.55 ? -1 : left.x > 0.55 ? 1 : 0;
      if (stickX !== 0 && this.prevStickMenuDirX === 0) {
        if (stickX === -1) menuLeft = true;
        if (stickX === 1) menuRight = true;
      }
      this.prevStickMenuDirX = stickX;

      for (let i = 0; i < len; i++) {
        this.prevButtons[i] = this.curButtons[i];
      }
    } else {
      if (this.prevButtons.length > 0) this.prevButtons.fill(false);
      this.prevStickMenuDirY = 0;
      this.prevStickMenuDirX = 0;
    }

    // Keyboard & Mouse fallback
    let kbX = 0;
    let kbY = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kbX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kbX += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) kbY -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) kbY += 1;
    if (kbX !== 0 || kbY !== 0) {
      const len = Math.hypot(kbX, kbY);
      moveX = kbX / len;
      moveY = kbY / len;
    }

    if (!hasAimInput && this.mouseMovedRecently && performance.now() - this.lastMouseTime < 8000) {
      const dx = this.mousePos.x - this.canvasCenter.x;
      const dy = this.mousePos.y - this.canvasCenter.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 6) {
        aimX = dx / dist;
        aimY = dy / dist;
        hasAimInput = true;
      }
    }

    // Primary on R2 (LMB / J), Secondary on R1 (MMB / Q / C)
    if ((this.mouseDownLeft && !this.prevMouseLeft) || this.keyJustPressed('KeyJ')) {
      attackR2Pressed = true;
    }
    if ((this.mouseDownMiddle && !this.prevMouseMiddle) || this.keyJustPressed('KeyQ') || this.keyJustPressed('KeyC')) {
      attackR1Pressed = true;
    }
    if ((this.mouseDownRight && !this.prevMouseRight) || this.keyJustPressed('KeyK')) {
      parryPressed = true;
    }
    if (this.keyJustPressed('Space') || this.keyJustPressed('ShiftLeft')) {
      dashPressed = true;
    }
    if (this.keyJustPressed('KeyE') || this.keyJustPressed('KeyF')) {
      interactPressed = true;
    }
    if (this.keyJustPressed('Tab') || this.keyJustPressed('KeyI')) {
      inventoryPressed = true;
    }
    if (this.keyJustPressed('Escape') || this.keyJustPressed('KeyP')) {
      pausePressed = true;
    }

    if (this.keyJustPressed('ArrowUp') || this.keyJustPressed('KeyW')) menuUp = true;
    if (this.keyJustPressed('ArrowDown') || this.keyJustPressed('KeyS')) menuDown = true;
    if (this.keyJustPressed('ArrowLeft') || this.keyJustPressed('KeyA')) menuLeft = true;
    if (this.keyJustPressed('ArrowRight') || this.keyJustPressed('KeyD')) menuRight = true;
    if (this.keyJustPressed('Enter') || this.keyJustPressed('Space')) menuConfirm = true;
    if (this.keyJustPressed('Escape')) menuBack = true;
    if (this.keyJustPressed('KeyX')) menuSquare = true;
    if (this.keyJustPressed('KeyQ') || this.keyJustPressed('BracketLeft')) menuL1 = true;
    if (this.keyJustPressed('KeyE') || this.keyJustPressed('BracketRight')) menuR1 = true;
    if (this.keyJustPressed('KeyR')) menuR2 = true;

    this.prevKeys.clear();
    this.keys.forEach((k) => this.prevKeys.add(k));
    this.prevMouseLeft = this.mouseDownLeft;
    this.prevMouseRight = this.mouseDownRight;
    this.prevMouseMiddle = this.mouseDownMiddle;

    return {
      moveX,
      moveY,
      aimX,
      aimY,
      hasAimInput,
      attackR1Pressed,
      attackR2Pressed,
      parryPressed,
      dashPressed,
      interactPressed,
      inventoryPressed,
      pausePressed,
      menuUp,
      menuDown,
      menuLeft,
      menuRight,
      menuConfirm,
      menuBack,
      menuSquare,
      menuR1,
      menuL1,
      menuR2,
      gamepadConnected: Boolean(pad),
      gamepadName: pad ? pad.id : '',
    };
  }
}
