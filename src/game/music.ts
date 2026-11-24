// 3-Mode Realistic Breakcore OST Engine:
// 1) MENU: Drums-only Breakbeat groove (balanced: not too aggressive, not too chill)
// 2) CALM: In-game exploration (atmospheric half-relaxed breakcore + pads/sub)
// 3) COMBAT: Hyper-aggressive Breakcore (dense Amen chopper drills, double-kicks, distorted Reese & acid)

export type MusicMode = 'MENU' | 'CALM' | 'COMBAT';

const KICK_BAR_A = new Set([0, 2, 6, 10, 11, 14]);
const KICK_BAR_B = new Set([0, 3, 5, 8, 10, 13, 15]);
const CALM_ROOTS = [110, 98, 103.8, 87.3];
const CALM_SUB = [55, 55, 49, 51.9];
const COMBAT_RIFF = [55, 55, 65.4, 58.3, 49, 55, 61.7, 73.4];

class BreakcoreMusicEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private menuGain: GainNode | null = null;
  private calmGain: GainNode | null = null;
  private aggroGain: GainNode | null = null;
  private drumBus: GainNode | null = null;
  private shaper: WaveShaperNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private isPlaying = false;
  private mode: MusicMode = 'MENU';
  private timerId: number | null = null;
  private nextStepTime = 0;
  private step = 0;

  // 172 BPM Breakcore 16th-note clock
  private readonly stepDur = 60 / 172 / 4;

  public init() {
    try {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        return;
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.28;

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 12;
      comp.ratio.value = 5.5;
      comp.attack.value = 0.002;
      comp.release.value = 0.11;
      comp.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.shaper = this.ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = ((3 + 12) * x * 22 * (Math.PI / 180)) / (Math.PI + 12 * Math.abs(x));
      }
      this.shaper.curve = curve;

      // 1) Menu Drum-Only Bus
      this.menuGain = this.ctx.createGain();
      this.menuGain.gain.value = this.mode === 'MENU' ? 1.0 : 0.0;
      this.menuGain.connect(comp);

      // 2) In-game Calm Bus
      this.calmGain = this.ctx.createGain();
      this.calmGain.gain.value = this.mode === 'CALM' ? 1.0 : 0.0;
      const calmFilter = this.ctx.createBiquadFilter();
      calmFilter.type = 'lowpass';
      calmFilter.frequency.value = 1950;
      this.calmGain.connect(calmFilter).connect(comp);

      // 3) In-game Hyper-Aggressive Combat Bus
      this.aggroGain = this.ctx.createGain();
      this.aggroGain.gain.value = this.mode === 'COMBAT' ? 1.0 : 0.0;
      this.drumBus = this.ctx.createGain();
      this.drumBus.gain.value = 1.0;
      this.drumBus.connect(this.shaper);
      this.shaper.connect(this.aggroGain);
      this.aggroGain.connect(comp);

      const len = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    } catch {
      // ignore WebAudio init failure
    }
  }

  public start() {
    this.init();
    if (!this.ctx || this.isPlaying) return;
    this.isPlaying = true;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.scheduleLoop();
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.28, this.ctx.currentTime, 0.08);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicMode(mode: MusicMode) {
    if (mode === this.mode) return;
    this.mode = mode;

    if (!this.ctx || !this.menuGain || !this.calmGain || !this.aggroGain) return;
    const now = this.ctx.currentTime;
    this.menuGain.gain.setTargetAtTime(mode === 'MENU' ? 1.0 : 0.0, now, 0.28);
    this.calmGain.gain.setTargetAtTime(mode === 'CALM' ? 1.0 : mode === 'COMBAT' ? 0.06 : 0.0, now, 0.32);
    this.aggroGain.gain.setTargetAtTime(mode === 'COMBAT' ? 1.0 : 0.0, now, 0.26);
  }

  private scheduleLoop = () => {
    if (!this.isPlaying || !this.ctx) return;

    // Prevent catastrophic WebAudio node bursts after backgrounding / mobile fullscreen exit
    if (document.hidden || this.ctx.state !== 'running') {
      this.nextStepTime = this.ctx.currentTime + 0.05;
      this.timerId = window.setTimeout(this.scheduleLoop, 120);
      return;
    }

    const now = this.ctx.currentTime;
    if (this.nextStepTime < now - 0.12) {
      this.nextStepTime = now + 0.02;
    }

    const lookAhead = 0.15;
    let guard = 0;
    while (this.nextStepTime < now + lookAhead && guard < 4) {
      this.scheduleStep(this.step, this.nextStepTime);
      this.nextStepTime += this.stepDur;
      this.step = (this.step + 1) % 128;
      guard++;
    }
    this.timerId = window.setTimeout(this.scheduleLoop, 45);
  };

  private scheduleStep(step: number, t: number) {
    if (!this.ctx || !this.menuGain || !this.calmGain || !this.aggroGain || !this.drumBus) return;

    const barStep = step % 16;
    const bar = Math.floor(step / 16); // 0..7
    const sd = this.stepDur;

    // Only synthesize voices for active/blending buses to save CPU!
    const runMenu = this.mode === 'MENU';
    const runCalm = this.mode === 'CALM';
    const runCombat = this.mode === 'COMBAT';

    // 1) MENU: DRUMS ONLY
    if (runMenu) {
      if (barStep === 0 || barStep === 2 || barStep === 10 || (bar % 2 === 1 && barStep === 14)) {
        this.triggerPunchKick(t, this.menuGain, barStep === 0 ? 0.56 : 0.42, 138, 42);
      }
      if (barStep === 4 || barStep === 12) {
        this.triggerAmenSnare(t, this.menuGain, 0.44, 1.0);
      } else if (barStep === 7 || barStep === 9 || (bar % 2 === 1 && barStep === 15)) {
        this.triggerAmenSnare(t, this.menuGain, 0.18, 1.18);
      }
      if (bar === 3 && barStep === 15) {
        this.triggerAmenSnare(t + sd * 0.5, this.menuGain, 0.24, 1.32);
      }
      if (bar === 7 && barStep >= 12) {
        if (barStep === 14) this.triggerAmenSnare(t, this.menuGain, 0.34, 1.15);
        if (barStep === 15) {
          this.triggerAmenSnare(t, this.menuGain, 0.26, 1.35);
          this.triggerAmenSnare(t + sd * 0.5, this.menuGain, 0.32, 1.55);
        }
      }
      if (barStep % 2 === 0) {
        this.triggerRide(t, this.menuGain, barStep % 4 === 0 ? 0.13 : 0.075);
      } else {
        this.triggerHat(t, this.menuGain, 0.07, 0.03);
      }
    }

    // 2) IN-GAME CALM: Half-Relaxed Atmospheric Breakcore
    if (runCalm) {
      if (barStep === 0 || barStep === 10) {
        this.triggerPunchKick(t, this.calmGain, 0.46, 120, 42);
      }
      if (barStep === 4 || barStep === 12) {
        this.triggerAmenSnare(t, this.calmGain, 0.3, 0.96);
      } else if (barStep === 7 || barStep === 15) {
        this.triggerAmenSnare(t, this.calmGain, 0.13, 1.15);
      }
      if (barStep % 2 === 0) {
        this.triggerRide(t, this.calmGain, barStep % 4 === 0 ? 0.1 : 0.05);
      }
      if (step % 32 === 0) {
        const root = CALM_ROOTS[(bar >> 1) % CALM_ROOTS.length];
        this.triggerPad(t, this.calmGain, [root, root * 1.189, root * 1.498], sd * 30);
      }
      if (barStep === 0 || barStep === 6 || barStep === 10) {
        this.triggerReeseBass(t, this.calmGain, CALM_SUB[bar % CALM_SUB.length], sd * 2.4, 0.24, false);
      }
    }

    // 3) IN-GAME COMBAT: HYPER-AGGRESSIVE CHOPPED BREAKCORE
    if (runCombat) {
      const kickPattern = bar % 2 === 0 ? KICK_BAR_A : KICK_BAR_B;
      if (kickPattern.has(barStep)) {
        this.triggerPunchKick(t, this.drumBus, 0.78, 180, 36);
      }
      if (bar % 2 === 1 && (barStep === 11 || barStep === 14)) {
        this.triggerPunchKick(t + sd * 0.5, this.drumBus, 0.62, 175, 38);
      }

      if (barStep === 4 || barStep === 12) {
        this.triggerAmenSnare(t, this.drumBus, 0.68, 1.0);
      } else if (barStep === 7 || barStep === 9 || barStep === 15) {
        this.triggerAmenSnare(t, this.drumBus, 0.34, 1.24);
      }

      if (bar % 2 === 1 && barStep >= 12) {
        this.triggerAmenSnare(t, this.drumBus, 0.48, 1.15 + (barStep - 12) * 0.16);
        this.triggerAmenSnare(t + sd * 0.5, this.drumBus, 0.42, 1.3 + (barStep - 12) * 0.18);
        if (barStep === 15) {
          this.triggerAmenSnare(t + sd * 0.25, this.drumBus, 0.36, 2.05);
          this.triggerAmenSnare(t + sd * 0.75, this.drumBus, 0.44, 2.35);
        }
      } else if ((bar === 2 || bar === 6) && barStep >= 10) {
        this.triggerPunchKick(t, this.drumBus, 0.66, 185, 40);
        this.triggerAmenSnare(t + sd * 0.5, this.drumBus, 0.46, 1.55);
      }

      this.triggerRide(t, this.drumBus, barStep % 2 === 0 ? 0.18 : 0.1);
      if (barStep % 2 === 1) {
        this.triggerHat(t, this.drumBus, 0.13, 0.032);
      }
      if (barStep === 0 && bar % 2 === 0) {
        this.triggerCrash(t, this.drumBus, 0.22);
      }

      if (barStep % 2 === 0) {
        const note = COMBAT_RIFF[((barStep >> 1) + bar) % COMBAT_RIFF.length];
        this.triggerReeseBass(t, this.aggroGain, note, sd * 1.45, 0.38, true);
      }

      if (barStep === 0 || barStep === 3 || barStep === 6 || barStep === 11) {
        const lead = bar % 2 === 0 ? 220 : 261.6;
        this.triggerAcidStab(t, this.aggroGain, lead, sd * 1.35);
      }
    }
  }

  private triggerPunchKick(t: number, dest: AudioNode, vol: number, startFreq: number, endFreq: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq * 0.85, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.07);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + 0.19);

    const click = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    click.type = 'sine';
    click.frequency.setValueAtTime(240, t);
    click.frequency.exponentialRampToValueAtTime(65, t + 0.018);
    cg.gain.setValueAtTime(vol * 0.32, t);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
    click.connect(cg).connect(dest);
    click.start(t);
    click.stop(t + 0.025);
  }

  private triggerAmenSnare(t: number, dest: AudioNode, vol: number, pitchMult: number) {
    if (!this.ctx || !this.noiseBuffer) return;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime(2100 * pitchMult, t);
    hp.Q.value = 0.55;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.9, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(hp).connect(ng).connect(dest);
    src.start(t);
    src.stop(t + 0.17);

    const air = this.ctx.createBufferSource();
    air.buffer = this.noiseBuffer;
    const airHp = this.ctx.createBiquadFilter();
    airHp.type = 'highpass';
    airHp.frequency.setValueAtTime(5200 * Math.min(1.8, pitchMult), t);
    const ag = this.ctx.createGain();
    ag.gain.setValueAtTime(vol * 0.44, t);
    ag.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
    air.connect(airHp).connect(ag).connect(dest);
    air.start(t);
    air.stop(t + 0.1);

    const osc = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(230 * pitchMult, t);
    osc.frequency.exponentialRampToValueAtTime(115 * pitchMult, t + 0.048);
    og.gain.setValueAtTime(vol * 0.65, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    osc.connect(og).connect(dest);
    osc.start(t);
    osc.stop(t + 0.075);
  }

  private triggerHat(t: number, dest: AudioNode, vol: number, dur: number) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(7600, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(hp).connect(g).connect(dest);
    src.start(t);
    src.stop(t + dur + 0.01);
  }

  private triggerRide(t: number, dest: AudioNode, vol: number) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(7200, t);
    bp.Q.value = 1.1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    src.connect(bp).connect(g).connect(dest);
    src.start(t);
    src.stop(t + 0.16);

    const ping = this.ctx.createOscillator();
    const pg = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.setValueAtTime(3420, t);
    pg.gain.setValueAtTime(vol * 0.15, t);
    pg.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    ping.connect(pg).connect(dest);
    ping.start(t);
    ping.stop(t + 0.06);
  }

  private triggerCrash(t: number, dest: AudioNode, vol: number) {
    if (!this.ctx || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(4200, t);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    src.connect(hp).connect(g).connect(dest);
    src.start(t);
    src.stop(t + 0.5);
  }

  private triggerReeseBass(t: number, dest: AudioNode, freq: number, dur: number, vol: number, aggro: boolean) {
    if (!this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    osc1.type = aggro ? 'triangle' : 'sine';
    osc2.type = aggro ? 'sawtooth' : 'sine';
    osc1.frequency.setValueAtTime(freq, t);
    osc2.frequency.setValueAtTime(aggro ? freq * 1.008 : freq * 0.5, t);

    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(aggro ? 520 : 280, t);
    lp.Q.value = aggro ? 2.4 : 0.7;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc1.connect(lp);
    osc2.connect(lp);
    lp.connect(g).connect(dest);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + dur + 0.02);
    osc2.stop(t + dur + 0.02);
  }

  private triggerPad(t: number, dest: AudioNode, freqs: number[], dur: number) {
    if (!this.ctx) return;
    for (let i = 0; i < freqs.length; i++) {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], t);

      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(850, t);

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.45);
      g.gain.linearRampToValueAtTime(0.001, t + dur);

      osc.connect(lp).connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  private triggerAcidStab(t: number, dest: AudioNode, freq: number, dur: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1200, t);
    bp.frequency.exponentialRampToValueAtTime(420, t + dur);
    bp.Q.value = 1.8;

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.095, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(bp).connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }
}

export const music = new BreakcoreMusicEngine();
