// Web Audio API procedural sound engine for Dungeon Trouble
import { AudioSettings } from './types';

const AUDIO_SETTINGS_KEY = 'dungeon_trouble_audio_v1';

class SoundFX {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = {
    muted: false,
    masterVolume: 0.85,
    sfxVolume: 0.9,
    musicVolume: 0.45,
  };
  private ambientInterval: ReturnType<typeof setInterval> | null = null;
  private currentZoneTheme: string = 'town';
  private lastFootstepTime = 0;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(AUDIO_SETTINGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.settings = {
            muted: Boolean(parsed.muted),
            masterVolume: typeof parsed.masterVolume === 'number' ? Math.max(0, Math.min(1, parsed.masterVolume)) : 0.85,
            sfxVolume: typeof parsed.sfxVolume === 'number' ? Math.max(0, Math.min(1, parsed.sfxVolume)) : 0.9,
            musicVolume: typeof parsed.musicVolume === 'number' ? Math.max(0, Math.min(1, parsed.musicVolume)) : 0.45,
          };
        }
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveSettings() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(this.settings));
      }
    } catch {
      // Ignore storage errors
    }
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AudioSettings>): AudioSettings {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    return this.getSettings();
  }

  private getEffectiveSfxGain(baseGain: number): number {
    if (this.settings.muted) return 0;
    return baseGain * this.settings.masterVolume * this.settings.sfxVolume;
  }

  private getEffectiveMusicGain(baseGain: number): number {
    if (this.settings.muted) return 0;
    return baseGain * this.settings.masterVolume * this.settings.musicVolume;
  }

  private getContext(): AudioContext | null {
    if (this.settings.muted || this.settings.masterVolume <= 0) return null;
    try {
      if (!this.ctx && typeof window !== 'undefined') {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  toggleSound(on?: boolean): boolean {
    const enabled = on !== undefined ? on : this.settings.muted;
    this.settings.muted = !enabled;
    this.saveSettings();
    return !this.settings.muted;
  }

  isSoundEnabled(): boolean {
    return !this.settings.muted;
  }

  setAmbientZone(themeOrZone: string) {
    this.currentZoneTheme = themeOrZone;
    if (!this.ambientInterval && typeof window !== 'undefined') {
      this.ambientInterval = setInterval(() => {
        this.playAmbientPulse();
      }, 4200);
    }
  }

  private playAmbientPulse() {
    const gainVal = this.getEffectiveMusicGain(0.05);
    if (gainVal <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const isTown = this.currentZoneTheme === 'town';
      osc.type = isTown ? 'sine' : 'triangle';

      // Atmospheric dark-fantasy drone chord notes
      const townFreqs = [130.81, 164.81, 196.0, 246.94]; // C3, E3, G3, B3
      const dungeonFreqs = [73.42, 87.31, 110.0, 103.83]; // D2, F2, A2, G#2
      const pool = isTown ? townFreqs : dungeonFreqs;
      const freq = pool[Math.floor(Math.random() * pool.length)];

      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(freq * 1.01, ctx.currentTime + 3.8);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(gainVal, ctx.currentTime + 1.4);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 4.0);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 4.1);
    } catch {
      // Ignore audio context state errors
    }
  }

  playFootstep() {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - this.lastFootstepTime < 290) return;
    this.lastFootstepTime = now;

    const g = this.getEffectiveSfxGain(0.045);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const pitch = 85 + Math.random() * 25;
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.055);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  playUiClick() {
    const g = this.getEffectiveSfxGain(0.12);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.045);
      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.055);
    } catch {}
  }

  playSwing() {
    const g = this.getEffectiveSfxGain(0.18);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(280, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {}
  }

  playHit(isCrit = false) {
    const g = this.getEffectiveSfxGain(isCrit ? 0.32 : 0.2);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isCrit ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(isCrit ? 400 : 200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  }

  playFireball() {
    const g = this.getEffectiveSfxGain(0.28);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.25);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.25);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      noise.stop(ctx.currentTime + 0.26);
    } catch {}
  }

  playFrost() {
    const g = this.getEffectiveSfxGain(0.2);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    } catch {}
  }

  playDash() {
    const g = this.getEffectiveSfxGain(0.18);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch {}
  }

  playLootDrop() {
    const g = this.getEffectiveSfxGain(0.15);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.05;
        gain.gain.setValueAtTime(g, startTime);
        gain.gain.linearRampToValueAtTime(0.01, startTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.13);
      });
    } catch {}
  }

  playPotion() {
    const g = this.getEffectiveSfxGain(0.2);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(480, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch {}
  }

  playLevelUp() {
    const g = this.getEffectiveSfxGain(0.18);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const melody = [392.0, 523.25, 659.25, 783.99, 1046.5];
      melody.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.08;
        gain.gain.setValueAtTime(g, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.26);
      });
    } catch {}
  }

  playEquip() {
    const g = this.getEffectiveSfxGain(0.16);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(740, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch {}
  }

  playPortal() {
    const g = this.getEffectiveSfxGain(0.22);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {}
  }

  playBossRoar() {
    const g = this.getEffectiveSfxGain(0.28);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(52, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(g, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.48);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  playBossDeath() {
    const g = this.getEffectiveSfxGain(0.25);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [220, 185, 146.8, 110, 73.4];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const t = ctx.currentTime + idx * 0.14;
        gain.gain.setValueAtTime(g, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch {}
  }

  playRespawn() {
    const g = this.getEffectiveSfxGain(0.18);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const notes = [261.63, 329.63, 392.0, 523.25];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t = ctx.currentTime + idx * 0.08;
        gain.gain.setValueAtTime(g, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.26);
      });
    } catch {}
  }
}

export const sound = new SoundFX();
