// Web Audio API procedural sound engine & Positional Town-1 Ambient Audio Manager for Dungeon Trouble
import { AudioSettings, TimeOfDayPhase } from './types';

const AUDIO_SETTINGS_KEY = 'dungeon_trouble_audio_v1';

export type TownAmbientCategory =
  | 'birds'
  | 'wind'
  | 'market_chatter'
  | 'water'
  | 'forge'
  | 'sanctuary';

export interface TownSoundEmitter {
  id: string;
  label: string;
  category: TownAmbientCategory;
  x: number; // World X coordinate
  y: number; // World Y coordinate
  radius: number; // Max audible radius in world units
  baseWeight: number;
}

export interface SpatialAudioListenerState {
  zone: 'town' | 'dungeon';
  playerX: number;
  playerY: number;
  playerVx: number;
  playerVy: number;
  timeOfDayPhase?: TimeOfDayPhase;
  isIndoors?: boolean;
  isOnRoad?: boolean;
  isInWater?: boolean;
  waterProximity?: number; // 0..1 based on nearby river/lake/fountain tiles
  waterPan?: number; // -1..1 stereo pan toward nearest water
  treeDensity?: number; // 0..1 based on nearby forest/grove tiles
  treePan?: number; // -1..1 stereo pan toward nearest trees
  nearbyNpcCount?: number;
  nearestNpcPan?: number;
}

export interface TownSoundscapeWeights {
  birdsGain: number;
  birdsPan: number;
  windGain: number;
  windPan: number;
  marketChatterGain: number;
  marketChatterPan: number;
  waterGain: number;
  waterPan: number;
  forgeGain: number;
  forgePan: number;
  sanctuaryGain: number;
  sanctuaryPan: number;
  dominantLabel: string;
}

// Convert tile coordinate (tx, ty) on the 96x96 Town-1 map (tileSize=64, origin=0) to world center
const townTileToWorld = (tx: number, ty: number): { x: number; y: number } => ({
  x: tx * 64 + 32,
  y: ty * 64 + 32,
});

/**
 * Authoritative positional sound emitters placed across Town-1 (Oakridge Valley).
 */
export const TOWN_SOUND_EMITTERS: readonly TownSoundEmitter[] = [
  // Woodland Songbird Groves
  {
    id: 'grove_abbey_glade',
    label: 'Whispering Abbey Woodland',
    category: 'birds',
    ...townTileToWorld(68, 22),
    radius: 960,
    baseWeight: 1.0,
  },
  {
    id: 'grove_northern_woods',
    label: 'Northern Pine & Oak Grove',
    category: 'birds',
    ...townTileToWorld(32, 14),
    radius: 980,
    baseWeight: 0.95,
  },
  {
    id: 'grove_southeast_orchard',
    label: 'Southeast Miller Orchard',
    category: 'birds',
    ...townTileToWorld(73, 68),
    radius: 960,
    baseWeight: 1.0,
  },
  {
    id: 'grove_western_millpond',
    label: 'Western Millpond Woods',
    category: 'birds',
    ...townTileToWorld(24, 54),
    radius: 920,
    baseWeight: 0.9,
  },
  {
    id: 'grove_sanctuary_canopy',
    label: 'Sanctuary Parkland Trees',
    category: 'birds',
    ...townTileToWorld(41, 39),
    radius: 820,
    baseWeight: 0.8,
  },
  {
    id: 'grove_lakeside_south',
    label: 'Southern Lakeside Woods',
    category: 'birds',
    ...townTileToWorld(38, 76),
    radius: 920,
    baseWeight: 0.9,
  },

  // Distant Market Chatter, Plaza Bustle & Tavern Murmur
  {
    id: 'market_garrick_emporium',
    label: "Garrick's Market & Curios",
    category: 'market_chatter',
    ...townTileToWorld(79, 48),
    radius: 1050,
    baseWeight: 1.0,
  },
  {
    id: 'plaza_central_sanctuary',
    label: 'Central Sanctuary Plaza',
    category: 'market_chatter',
    ...townTileToWorld(48, 46),
    radius: 880,
    baseWeight: 0.85,
  },
  {
    id: 'tavern_prancing_griffin',
    label: 'The Prancing Griffin Inn',
    category: 'market_chatter',
    ...townTileToWorld(18, 18),
    radius: 920,
    baseWeight: 0.95,
  },
  {
    id: 'homestead_miller_granary',
    label: "Orchard Miller's Courtyard",
    category: 'market_chatter',
    ...townTileToWorld(78, 79),
    radius: 720,
    baseWeight: 0.65,
  },

  // Wind & High Valley Breezes
  {
    id: 'wind_high_manor_ridge',
    label: 'High Manor Northern Ridge',
    category: 'wind',
    ...townTileToWorld(48, 14),
    radius: 1350,
    baseWeight: 0.9,
  },
  {
    id: 'wind_open_valley_meadow',
    label: 'Silverbrook Open Meadow',
    category: 'wind',
    ...townTileToWorld(58, 36),
    radius: 1500,
    baseWeight: 0.85,
  },
  {
    id: 'wind_southwest_keep',
    label: 'Southwest Stone Keep Bluff',
    category: 'wind',
    ...townTileToWorld(22, 74),
    radius: 1250,
    baseWeight: 0.85,
  },

  // Flowing Water, Fountain & Lakes
  {
    id: 'fountain_sanctuary',
    label: 'Sanctuary Stone Fountain',
    category: 'water',
    ...townTileToWorld(48, 46),
    radius: 640,
    baseWeight: 0.95,
  },
  {
    id: 'water_mirror_lake',
    label: 'Emerald Mirror Lake',
    category: 'water',
    ...townTileToWorld(62, 64),
    radius: 980,
    baseWeight: 1.0,
  },
  {
    id: 'water_whispering_pond',
    label: 'Whispering Abbey Pond',
    category: 'water',
    ...townTileToWorld(65, 23),
    radius: 680,
    baseWeight: 0.85,
  },
  {
    id: 'water_western_millpond',
    label: 'Western Millpond',
    category: 'water',
    ...townTileToWorld(28, 58),
    radius: 660,
    baseWeight: 0.85,
  },

  // Blacksmith Forge
  {
    id: 'forge_torvald_smithy',
    label: "Torvald's Ironworks & Smithy",
    category: 'forge',
    ...townTileToWorld(15, 48),
    radius: 820,
    baseWeight: 1.0,
  },

  // Sacred Abbey & Abyssal Portal
  {
    id: 'sanctuary_abbey_dawn',
    label: 'Abbey of the Dawn Sanctuary',
    category: 'sanctuary',
    ...townTileToWorld(78, 16),
    radius: 760,
    baseWeight: 0.9,
  },
  {
    id: 'sanctuary_abyssal_portal',
    label: 'Ancient Abyssal Portal',
    category: 'sanctuary',
    ...townTileToWorld(33, 25),
    radius: 680,
    baseWeight: 0.85,
  },
];

/**
 * Smooth cosine-eased distance attenuation in [0, 1].
 */
export function computeSpatialAttenuation(
  listenerX: number,
  listenerY: number,
  emitterX: number,
  emitterY: number,
  radius: number
): number {
  if (radius <= 0) return 0;
  const dist = Math.hypot(emitterX - listenerX, emitterY - listenerY);
  if (dist >= radius) return 0;
  const t = dist / radius;
  // Smooth falloff curve: 0.5 * (1 + cos(pi * t))
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

/**
 * Computes isometric screen-space stereo pan in [-0.85, 0.85] from world delta.
 * In 2.5D isometric projection, screen X is proportional to (dx - dy).
 */
export function computeIsometricStereoPan(
  listenerX: number,
  listenerY: number,
  emitterX: number,
  emitterY: number,
  maxRange = 700
): number {
  const dx = emitterX - listenerX;
  const dy = emitterY - listenerY;
  const isoScreenDeltaX = (dx - dy) * 0.7071;
  const normalized = isoScreenDeltaX / Math.max(120, maxRange);
  return Math.max(-0.85, Math.min(0.85, normalized));
}

/**
 * Evaluates all positional sound emitters and local terrain proximity for the player's location in Town-1.
 */
export function evaluateTownSoundscape(state: SpatialAudioListenerState): TownSoundscapeWeights {
  if (state.zone !== 'town') {
    return {
      birdsGain: 0,
      birdsPan: 0,
      windGain: 0,
      windPan: 0,
      marketChatterGain: 0,
      marketChatterPan: 0,
      waterGain: 0,
      waterPan: 0,
      forgeGain: 0,
      forgePan: 0,
      sanctuaryGain: 0,
      sanctuaryPan: 0,
      dominantLabel: 'Dungeon Depths',
    };
  }

  let birdsGain = 0;
  let birdsPanSum = 0;
  let windGain = 0.22; // Base gentle valley breeze across Town-1
  let windPanSum = 0;
  let marketChatterGain = 0;
  let marketChatterPanSum = 0;
  let waterGain = 0;
  let waterPanSum = 0;
  let forgeGain = 0;
  let forgePanSum = 0;
  let sanctuaryGain = 0;
  let sanctuaryPanSum = 0;

  let highestWeight = 0.15;
  let dominantLabel = 'Oakridge Valley Meadow';

  for (let i = 0; i < TOWN_SOUND_EMITTERS.length; i++) {
    const em = TOWN_SOUND_EMITTERS[i];
    const att = computeSpatialAttenuation(state.playerX, state.playerY, em.x, em.y, em.radius);
    if (att <= 0.001) continue;

    const w = att * em.baseWeight;
    const pan = computeIsometricStereoPan(state.playerX, state.playerY, em.x, em.y, em.radius * 0.75);

    if (w > highestWeight) {
      highestWeight = w;
      dominantLabel = em.label;
    }

    switch (em.category) {
      case 'birds':
        birdsGain = Math.min(1, birdsGain + w * 0.85);
        birdsPanSum += pan * w;
        break;
      case 'wind':
        windGain = Math.min(1, windGain + w * 0.65);
        windPanSum += pan * w;
        break;
      case 'market_chatter':
        marketChatterGain = Math.min(1, marketChatterGain + w * 0.9);
        marketChatterPanSum += pan * w;
        break;
      case 'water':
        waterGain = Math.min(1, waterGain + w * 0.9);
        waterPanSum += pan * w;
        break;
      case 'forge':
        forgeGain = Math.min(1, forgeGain + w);
        forgePanSum += pan * w;
        break;
      case 'sanctuary':
        sanctuaryGain = Math.min(1, sanctuaryGain + w);
        sanctuaryPanSum += pan * w;
        break;
    }
  }

  // Incorporate real-time local tile surroundings (trees, river tiles, and nearby wandering villagers)
  if (state.treeDensity && state.treeDensity > 0) {
    const treeBoost = state.treeDensity * 0.55;
    birdsGain = Math.min(1, birdsGain + treeBoost);
    birdsPanSum += (state.treePan ?? 0) * treeBoost;
    windGain = Math.min(1, windGain + state.treeDensity * 0.25);
  }

  if (state.waterProximity && state.waterProximity > 0) {
    const riverBoost = state.waterProximity * 0.85;
    waterGain = Math.min(1, Math.max(waterGain, riverBoost));
    waterPanSum += (state.waterPan ?? 0) * riverBoost;
    if (state.waterProximity > 0.45 && highestWeight < 0.5) {
      dominantLabel = 'Silverbrook Riverbank';
    }
  }

  if (state.nearbyNpcCount && state.nearbyNpcCount > 0) {
    const npcChatterBoost = Math.min(0.45, state.nearbyNpcCount * 0.16);
    marketChatterGain = Math.min(1, marketChatterGain + npcChatterBoost);
    marketChatterPanSum += (state.nearestNpcPan ?? 0) * npcChatterBoost;
  }

  // Time-of-day modulation: birds are liveliest at Dawn/Morning/Afternoon; market chatter peaks in Morning/Afternoon/Evening
  const phase = state.timeOfDayPhase ?? 'Morning';
  if (phase === 'Dawn') {
    birdsGain = Math.min(1, birdsGain * 1.2);
    marketChatterGain *= 0.65;
  } else if (phase === 'Night' || phase === 'Dusk') {
    // At night, songbirds quiet down (replaced by crickets/owl in synthesizer), market quiets except near Tavern
    birdsGain *= 0.55;
    marketChatterGain *= 0.5;
  }

  // Indoor acoustic muffling when player enters a building
  if (state.isIndoors) {
    birdsGain *= 0.22;
    windGain *= 0.25;
    waterGain *= 0.25;
    marketChatterGain = Math.min(1, marketChatterGain * 0.75 + 0.15);
  }

  const clampPan = (sum: number, gain: number) =>
    gain > 0.01 ? Math.max(-0.85, Math.min(0.85, sum / Math.max(0.25, gain))) : 0;

  return {
    birdsGain,
    birdsPan: clampPan(birdsPanSum, birdsGain),
    windGain,
    windPan: clampPan(windPanSum, windGain),
    marketChatterGain,
    marketChatterPan: clampPan(marketChatterPanSum, marketChatterGain),
    waterGain,
    waterPan: clampPan(waterPanSum, waterGain),
    forgeGain,
    forgePan: clampPan(forgePanSum, forgeGain),
    sanctuaryGain,
    sanctuaryPan: clampPan(sanctuaryPanSum, sanctuaryGain),
    dominantLabel,
  };
}

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

  // Continuous Web Audio nodes for smooth positional wind & water layers
  private sharedNoiseBuffer: AudioBuffer | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windGainNode: GainNode | null = null;
  private windPanner: StereoPannerNode | null = null;

  private waterSource: AudioBufferSourceNode | null = null;
  private waterFilter: BiquadFilterNode | null = null;
  private waterGainNode: GainNode | null = null;
  private waterPanner: StereoPannerNode | null = null;

  // Timers for positional micro-events in Town-1
  private birdCallTimer = 0.8;
  private marketChatterTimer = 0.5;
  private forgeStrikeTimer = 1.4;
  private sanctuaryChimeTimer = 2.2;
  private windGustPhase = 0;
  private lastSoundscape: TownSoundscapeWeights | null = null;

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
            masterVolume:
              typeof parsed.masterVolume === 'number'
                ? Math.max(0, Math.min(1, parsed.masterVolume))
                : 0.85,
            sfxVolume:
              typeof parsed.sfxVolume === 'number'
                ? Math.max(0, Math.min(1, parsed.sfxVolume))
                : 0.9,
            musicVolume:
              typeof parsed.musicVolume === 'number'
                ? Math.max(0, Math.min(1, parsed.musicVolume))
                : 0.45,
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
    if (this.settings.muted || this.settings.masterVolume <= 0) {
      this.silenceContinuousLayers();
    }
    return this.getSettings();
  }

  public getLastSoundscape(): TownSoundscapeWeights | null {
    return this.lastSoundscape;
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

  private getSharedNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.sharedNoiseBuffer && this.sharedNoiseBuffer.sampleRate === ctx.sampleRate) {
      return this.sharedNoiseBuffer;
    }
    // Generate 3 seconds of warm pink-tinted noise for wind, water, and crowd formants
    const length = Math.floor(ctx.sampleRate * 3.0);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.045;
      b6 = white * 0.115926;
    }
    this.sharedNoiseBuffer = buffer;
    return buffer;
  }

  private connectWithPan(
    ctx: AudioContext,
    sourceNode: AudioNode,
    panValue: number
  ): AudioNode {
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panValue)), ctx.currentTime);
      sourceNode.connect(panner);
      panner.connect(ctx.destination);
      return panner;
    }
    sourceNode.connect(ctx.destination);
    return sourceNode;
  }

  private ensureContinuousAmbientNodes(ctx: AudioContext) {
    const noiseBuffer = this.getSharedNoiseBuffer(ctx);

    if (!this.windSource) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 260;
        filter.Q.value = 1.6;

        const gain = ctx.createGain();
        gain.gain.value = 0.0001;

        src.connect(filter);
        filter.connect(gain);

        if (typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          panner.pan.value = 0;
          gain.connect(panner);
          panner.connect(ctx.destination);
          this.windPanner = panner;
        } else {
          gain.connect(ctx.destination);
        }

        src.start();
        this.windSource = src;
        this.windFilter = filter;
        this.windGainNode = gain;
      } catch {
        // Ignore if audio context not yet unlocked
      }
    }

    if (!this.waterSource) {
      try {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 640;
        filter.Q.value = 1.1;

        const gain = ctx.createGain();
        gain.gain.value = 0.0001;

        src.connect(filter);
        filter.connect(gain);

        if (typeof ctx.createStereoPanner === 'function') {
          const panner = ctx.createStereoPanner();
          panner.pan.value = 0;
          gain.connect(panner);
          panner.connect(ctx.destination);
          this.waterPanner = panner;
        } else {
          gain.connect(ctx.destination);
        }

        src.start();
        this.waterSource = src;
        this.waterFilter = filter;
        this.waterGainNode = gain;
      } catch {
        // Ignore if audio context not yet unlocked
      }
    }
  }

  private silenceContinuousLayers() {
    if (this.ctx && this.windGainNode) {
      try {
        this.windGainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      } catch {}
    }
    if (this.ctx && this.waterGainNode) {
      try {
        this.waterGainNode.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      } catch {}
    }
  }

  toggleSound(on?: boolean): boolean {
    const enabled = on !== undefined ? on : this.settings.muted;
    this.settings.muted = !enabled;
    if (this.settings.muted) {
      this.silenceContinuousLayers();
    }
    this.saveSettings();
    return !this.settings.muted;
  }

  isSoundEnabled(): boolean {
    return !this.settings.muted;
  }

  setAmbientZone(themeOrZone: string) {
    this.currentZoneTheme = themeOrZone;
    if (themeOrZone !== 'town') {
      this.silenceContinuousLayers();
    }
    if (!this.ambientInterval && typeof window !== 'undefined') {
      this.ambientInterval = setInterval(() => {
        this.playAmbientPulse();
      }, 4200);
    }
  }

  /**
   * Updates positional Town-1 ambient audio layers (wind, flowing water, birds,
   * distant market chatter, blacksmith anvil, and sanctuary chimes) based on the player's location.
   */
  public updateSpatialAmbience(dt: number, listener: SpatialAudioListenerState) {
    const weights = evaluateTownSoundscape(listener);
    this.lastSoundscape = weights;

    if (listener.zone !== 'town' || this.settings.muted || this.settings.masterVolume <= 0) {
      this.silenceContinuousLayers();
      return;
    }

    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    this.ensureContinuousAmbientNodes(ctx);
    this.windGustPhase += dt * 0.85;

    // 1. Update continuous Wind & Rustling Foliage layer
    if (this.windGainNode && this.windFilter) {
      const gustMod = 0.78 + 0.22 * Math.sin(this.windGustPhase) * Math.cos(this.windGustPhase * 0.43);
      const speedBoost = Math.min(0.25, Math.hypot(listener.playerVx, listener.playerVy) / 1400);
      const targetWindGain = this.getEffectiveMusicGain(
        (weights.windGain * gustMod + speedBoost) * 0.11
      );
      const cutoff = listener.isIndoors
        ? 155
        : 220 + weights.windGain * 190 + Math.sin(this.windGustPhase * 1.3) * 55;

      try {
        this.windGainNode.gain.setTargetAtTime(Math.max(0.0001, targetWindGain), ctx.currentTime, 0.2);
        this.windFilter.frequency.setTargetAtTime(cutoff, ctx.currentTime, 0.25);
        if (this.windPanner) {
          const driftPan = Math.max(
            -0.85,
            Math.min(0.85, weights.windPan + Math.sin(this.windGustPhase * 0.6) * 0.18)
          );
          this.windPanner.pan.setTargetAtTime(driftPan, ctx.currentTime, 0.3);
        }
      } catch {}
    }

    // 2. Update continuous Flowing Water & Fountain Cascade layer
    if (this.waterGainNode && this.waterFilter) {
      const rippleMod = 0.88 + 0.12 * Math.sin(this.windGustPhase * 3.4);
      const targetWaterGain = this.getEffectiveSfxGain(weights.waterGain * rippleMod * 0.14);
      const waterCutoff = listener.isInWater
        ? 820
        : 520 + weights.waterGain * 340 + Math.sin(this.windGustPhase * 2.7) * 65;

      try {
        this.waterGainNode.gain.setTargetAtTime(
          Math.max(0.0001, targetWaterGain),
          ctx.currentTime,
          0.18
        );
        this.waterFilter.frequency.setTargetAtTime(waterCutoff, ctx.currentTime, 0.2);
        if (this.waterPanner) {
          this.waterPanner.pan.setTargetAtTime(weights.waterPan, ctx.currentTime, 0.2);
        }
      } catch {}
    }

    // 3. Positional Woodland Birdsong (or nocturnal crickets/owl at Night)
    if (weights.birdsGain > 0.08) {
      this.birdCallTimer -= dt * (0.65 + weights.birdsGain * 1.15);
      if (this.birdCallTimer <= 0) {
        const isNight =
          listener.timeOfDayPhase === 'Night' || listener.timeOfDayPhase === 'Dusk';
        this.triggerPositionalBirdCall(ctx, weights.birdsGain, weights.birdsPan, isNight);
        this.birdCallTimer = isNight ? 2.4 + Math.random() * 3.2 : 1.3 + Math.random() * 2.6;
      }
    }

    // 4. Positional Distant Market Chatter, Crowd Bustle & Tavern Lute/Coins
    if (weights.marketChatterGain > 0.08) {
      this.marketChatterTimer -= dt * (0.7 + weights.marketChatterGain * 1.35);
      if (this.marketChatterTimer <= 0) {
        const isNearTavern = weights.dominantLabel.includes('Griffin');
        const isNearMarket = weights.dominantLabel.includes('Garrick');
        this.triggerPositionalMarketChatter(
          ctx,
          weights.marketChatterGain,
          weights.marketChatterPan,
          isNearTavern,
          isNearMarket
        );
        this.marketChatterTimer = 0.85 + Math.random() * 1.65;
      }
    }

    // 5. Positional Blacksmith Anvil & Forge
    if (weights.forgeGain > 0.12 && !listener.isIndoors) {
      this.forgeStrikeTimer -= dt * (0.6 + weights.forgeGain * 0.9);
      if (this.forgeStrikeTimer <= 0) {
        this.triggerPositionalForgeStrike(ctx, weights.forgeGain, weights.forgePan);
        this.forgeStrikeTimer = 1.9 + Math.random() * 2.8;
      }
    }

    // 6. Positional Abbey Chimes & Fountain Droplets
    if (weights.sanctuaryGain > 0.14 || weights.waterGain > 0.35) {
      this.sanctuaryChimeTimer -= dt;
      if (this.sanctuaryChimeTimer <= 0) {
        if (weights.sanctuaryGain >= weights.waterGain) {
          this.triggerPositionalSanctuaryChime(ctx, weights.sanctuaryGain, weights.sanctuaryPan);
        } else {
          this.triggerPositionalWaterDroplet(ctx, weights.waterGain, weights.waterPan);
        }
        this.sanctuaryChimeTimer = 2.6 + Math.random() * 3.4;
      }
    }
  }

  private triggerPositionalBirdCall(
    ctx: AudioContext,
    weight: number,
    basePan: number,
    isNight: boolean
  ) {
    const g = this.getEffectiveSfxGain(weight * 0.075);
    if (g <= 0.001) return;

    try {
      const pan = Math.max(-0.9, Math.min(0.9, basePan + (Math.random() - 0.5) * 0.28));

      if (isNight) {
        // Gentle nocturnal cricket chirp or soft woodland owl hoot
        if (Math.random() < 0.35) {
          // Soft distant owl ("hoo... hoo-hoo")
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          const t0 = ctx.currentTime;
          osc.frequency.setValueAtTime(385, t0);
          osc.frequency.exponentialRampToValueAtTime(325, t0 + 0.32);
          gain.gain.setValueAtTime(0.0001, t0);
          gain.gain.linearRampToValueAtTime(g * 0.65, t0 + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
          osc.connect(gain);
          this.connectWithPan(ctx, gain, pan);
          osc.start(t0);
          osc.stop(t0 + 0.4);
        } else {
          // Cricket high-frequency double pulse
          for (let p = 0; p < 3; p++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            const t = ctx.currentTime + p * 0.065;
            osc.frequency.setValueAtTime(3950 + (p % 2) * 120, t);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.linearRampToValueAtTime(g * 0.4, t + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
            osc.connect(gain);
            this.connectWithPan(ctx, gain, pan);
            osc.start(t);
            osc.stop(t + 0.055);
          }
        }
        return;
      }

      // Melodic daytime songbird phrase (2 to 4 chirps/trills)
      const noteCount = 2 + Math.floor(Math.random() * 3);
      const baseFreq = 2150 + Math.random() * 950;
      let cursor = ctx.currentTime;

      for (let i = 0; i < noteCount; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        const dur = 0.055 + Math.random() * 0.045;
        const startFreq = baseFreq * (1 + (i % 2 === 0 ? 0.08 : -0.05) + Math.random() * 0.12);
        const endFreq = startFreq * (i === noteCount - 1 ? 1.24 : 0.88 + Math.random() * 0.28);

        osc.frequency.setValueAtTime(startFreq, cursor);
        osc.frequency.exponentialRampToValueAtTime(endFreq, cursor + dur);

        gain.gain.setValueAtTime(0.0001, cursor);
        gain.gain.linearRampToValueAtTime(g * (0.75 + Math.random() * 0.25), cursor + dur * 0.25);
        gain.gain.exponentialRampToValueAtTime(0.0001, cursor + dur);

        osc.connect(gain);
        this.connectWithPan(ctx, gain, pan);

        osc.start(cursor);
        osc.stop(cursor + dur + 0.01);
        cursor += dur + 0.025 + Math.random() * 0.035;
      }
    } catch {}
  }

  private triggerPositionalMarketChatter(
    ctx: AudioContext,
    weight: number,
    basePan: number,
    isNearTavern: boolean,
    isNearMarket: boolean
  ) {
    const g = this.getEffectiveSfxGain(weight * 0.065);
    if (g <= 0.001) return;

    try {
      const pan = Math.max(-0.9, Math.min(0.9, basePan + (Math.random() - 0.5) * 0.24));
      const noiseBuffer = this.getSharedNoiseBuffer(ctx);

      // Formant-filtered syllabic crowd murmur (simulates warm distant human conversation)
      const syllableCount = 2 + Math.floor(Math.random() * 3);
      let cursor = ctx.currentTime;
      const voicePitchFormant = 340 + Math.random() * 380;

      for (let s = 0; s < syllableCount; s++) {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;

        const formant1 = ctx.createBiquadFilter();
        formant1.type = 'bandpass';
        const f1 = voicePitchFormant * (0.9 + Math.random() * 0.35);
        formant1.frequency.setValueAtTime(f1, cursor);
        formant1.frequency.linearRampToValueAtTime(f1 * (0.85 + Math.random() * 0.3), cursor + 0.14);
        formant1.Q.value = 4.2;

        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1150;

        const gain = ctx.createGain();
        const dur = 0.11 + Math.random() * 0.09;
        gain.gain.setValueAtTime(0.0001, cursor);
        gain.gain.linearRampToValueAtTime(g * 0.9, cursor + dur * 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, cursor + dur);

        src.connect(formant1);
        formant1.connect(lowpass);
        lowpass.connect(gain);
        this.connectWithPan(ctx, gain, pan);

        const offset = Math.random() * 2.0;
        src.start(cursor, offset, dur + 0.02);
        cursor += dur + 0.02 + Math.random() * 0.04;
      }

      // Occasional merchant coin clink at Garrick's Market or warm lute pluck at Griffin Inn
      if (isNearMarket && Math.random() < 0.32) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const t = ctx.currentTime + 0.08;
        osc.frequency.setValueAtTime(2480, t);
        osc.frequency.setValueAtTime(3120, t + 0.035);
        gain.gain.setValueAtTime(g * 0.45, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        osc.connect(gain);
        this.connectWithPan(ctx, gain, pan);
        osc.start(t);
        osc.stop(t + 0.15);
      } else if (isNearTavern && Math.random() < 0.38) {
        const luteNotes = [196.0, 220.0, 261.63, 293.66, 329.63, 392.0];
        const freq = luteNotes[Math.floor(Math.random() * luteNotes.length)];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        const t = ctx.currentTime + 0.05;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(g * 0.65, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
        osc.connect(gain);
        this.connectWithPan(ctx, gain, pan);
        osc.start(t);
        osc.stop(t + 0.38);
      }
    } catch {}
  }

  private triggerPositionalForgeStrike(ctx: AudioContext, weight: number, pan: number) {
    const g = this.getEffectiveSfxGain(weight * 0.08);
    if (g <= 0.001) return;

    try {
      const t = ctx.currentTime;
      const partials = [1360, 2080];
      for (let i = 0; i < partials.length; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(partials[i], t);
        gain.gain.setValueAtTime(g * (i === 0 ? 0.8 : 0.45), t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + (i === 0 ? 0.28 : 0.16));
        osc.connect(gain);
        this.connectWithPan(ctx, gain, pan);
        osc.start(t);
        osc.stop(t + 0.3);
      }
    } catch {}
  }

  private triggerPositionalSanctuaryChime(ctx: AudioContext, weight: number, pan: number) {
    const g = this.getEffectiveMusicGain(weight * 0.065);
    if (g <= 0.001) return;

    try {
      const chimeNotes = [523.25, 659.25, 783.99, 987.77, 1046.5];
      const freq = chimeNotes[Math.floor(Math.random() * chimeNotes.length)];
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(g, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      osc.connect(gain);
      this.connectWithPan(ctx, gain, pan);
      osc.start(t);
      osc.stop(t + 0.88);
    } catch {}
  }

  private triggerPositionalWaterDroplet(ctx: AudioContext, weight: number, pan: number) {
    const g = this.getEffectiveSfxGain(weight * 0.055);
    if (g <= 0.001) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const base = 680 + Math.random() * 420;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.65, t + 0.065);
      gain.gain.setValueAtTime(g, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      osc.connect(gain);
      this.connectWithPan(ctx, gain, pan);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {}
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

  playFootstep(surface: 'stone' | 'grass' | 'water' | 'wood' = 'stone') {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const minInterval = surface === 'water' ? 340 : 270;
    if (now - this.lastFootstepTime < minInterval) return;
    this.lastFootstepTime = now;

    const g = this.getEffectiveSfxGain(surface === 'water' ? 0.06 : 0.042);
    if (g <= 0.001) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      if (surface === 'water') {
        osc.type = 'sine';
        const pitch = 240 + Math.random() * 90;
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(420, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(g, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.085);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      } else {
        osc.type = surface === 'grass' ? 'sine' : 'triangle';
        const pitch =
          surface === 'stone'
            ? 115 + Math.random() * 30
            : surface === 'wood'
            ? 95 + Math.random() * 20
            : 75 + Math.random() * 20;
        osc.frequency.setValueAtTime(pitch, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(g, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.055);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      }
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
