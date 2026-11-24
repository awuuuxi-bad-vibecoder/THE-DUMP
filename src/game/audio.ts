class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;
  private noiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  public unlock() {
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();
        this.createNoiseBuffers();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch {
      // ignore audio context restrictions
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private createNoiseBuffers() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate;

    const white = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const wData = white.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      wData[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = white;

    // Warm pink noise for realistic foley whooshes & flesh thuds
    const pink = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const pData = pink.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const r = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + r * 0.0555179;
      b1 = 0.99332 * b1 + r * 0.0750759;
      b2 = 0.96900 * b2 + r * 0.1538520;
      b3 = 0.86650 * b3 + r * 0.3104856;
      b4 = 0.55000 * b4 + r * 0.5329522;
      b5 = -0.7616 * b5 - r * 0.0168980;
      pData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + r * 0.5362) * 0.11;
      b6 = r * 0.115926;
    }
    this.pinkNoiseBuffer = pink;
  }

  public playMenuSwitch() {
    if (this.muted || !this.ctx || !this.noiseBuffer) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1600, now);
    bp.Q.value = 3.0;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.09, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    src.connect(bp).connect(g).connect(this.ctx.destination);
    src.start(now);
    src.stop(now + 0.035);
  }

  public playMenuConfirm() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(185, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.08);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playSlash(comboIndex: number) {
    if (this.muted || !this.ctx) return;
    const buf = this.pinkNoiseBuffer ?? this.noiseBuffer;
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const peak = 1150 + comboIndex * 280;
    bp.frequency.setValueAtTime(280, now);
    bp.frequency.exponentialRampToValueAtTime(peak, now + 0.05);
    bp.frequency.exponentialRampToValueAtTime(240, now + 0.15);
    bp.Q.value = 1.3;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.32, now + 0.035);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    src.connect(bp).connect(g).connect(this.ctx.destination);
    src.start(now);
    src.stop(now + 0.17);
  }

  public playHit(heavy = false) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;

    const sub = this.ctx.createOscillator();
    const sg = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(heavy ? 125 : 155, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + (heavy ? 0.16 : 0.1));
    sg.gain.setValueAtTime(heavy ? 0.42 : 0.3, now);
    sg.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.18 : 0.11));
    sub.connect(sg).connect(this.ctx.destination);
    sub.start(now);
    sub.stop(now + 0.19);

    const buf = this.pinkNoiseBuffer ?? this.noiseBuffer;
    if (buf) {
      const n = this.ctx.createBufferSource();
      n.buffer = buf;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(heavy ? 850 : 1200, now);
      bp.Q.value = 1.1;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(heavy ? 0.32 : 0.22, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      n.connect(bp).connect(ng).connect(this.ctx.destination);
      n.start(now);
      n.stop(now + 0.1);
    }
  }

  public playParry() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const partials = [1040, 1690, 2510, 3890];
    for (let idx = 0; idx < partials.length; idx++) {
      const f = partials[idx];
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 0.985, now + 0.55);
      g.gain.setValueAtTime(0.14 / (idx + 1), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.58 - idx * 0.08);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    }
    if (this.noiseBuffer) {
      const n = this.ctx.createBufferSource();
      n.buffer = this.noiseBuffer;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(3200, now);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.24, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      n.connect(hp).connect(ng).connect(this.ctx.destination);
      n.start(now);
      n.stop(now + 0.05);
    }
  }

  public playParryAttempt() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playDash() {
    if (this.muted || !this.ctx) return;
    const buf = this.pinkNoiseBuffer ?? this.noiseBuffer;
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(920, now);
    filter.frequency.exponentialRampToValueAtTime(160, now + 0.16);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(now);
    src.stop(now + 0.18);
  }

  public playPlayerHurt() {
    this.playHit(true);
  }

  public playCrateBreak() {
    if (this.muted || !this.ctx) return;
    const buf = this.pinkNoiseBuffer ?? this.noiseBuffer;
    if (!buf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(560, now);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    src.connect(bp).connect(gain).connect(this.ctx.destination);
    src.start(now);
    src.stop(now + 0.17);
  }

  public playLoot(isArtifact: boolean) {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = isArtifact ? [392, 523.25, 659.25, 783.99] : [440, 587.33];
    for (let i = 0; i < notes.length; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const t = now + i * 0.06;
      osc.frequency.setValueAtTime(notes[i], t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.28);
    }
  }

  public playEnemyGlint() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, now);
    osc.frequency.exponentialRampToValueAtTime(2100, now + 0.07);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playHatchUnlock() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(92, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.28);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.34);
  }
}

export const sound = new SoundEngine();
