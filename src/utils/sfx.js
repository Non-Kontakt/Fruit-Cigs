import * as Tone from "tone";

// Sound effects using Tone.js synthesis
export const SFX = {
  _started: false,
  muted: false,
  async _ensure() {
    if (this.muted) return false;
    if (!this._started) {
      await Tone.start();
      this._started = true;
    }
    return true;
  },
  async reveal() {
    if (!await this._ensure()) return;
    // Quick ascending arpeggio — unlock/power-up feel
    const synth = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.3 },
      volume: -12,
    }).toDestination();
    const now = Tone.now();
    synth.triggerAttackRelease("C5", "16n", now);
    synth.triggerAttackRelease("E5", "16n", now + 0.07);
    synth.triggerAttackRelease("G5", "16n", now + 0.14);
    setTimeout(() => synth.dispose(), 1500);
  },
  async revealFirst() {
    if (!await this._ensure()) return;
    // Bigger fanfare for the first auto-reveal
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.4 },
      volume: -16,
    }).toDestination();
    const filter = new Tone.Filter(2000, "lowpass").toDestination();
    synth.disconnect();
    synth.connect(filter);
    const now = Tone.now();
    synth.triggerAttackRelease(["C4", "E4"], "8n", now);
    synth.triggerAttackRelease(["E4", "G4"], "8n", now + 0.12);
    synth.triggerAttackRelease(["G4", "C5"], "8n", now + 0.24);
    setTimeout(() => { synth.dispose(); filter.dispose(); }, 2000);
  },
  async advance() {
    if (!await this._ensure()) return;
    // Whoosh for advancing week
    const noise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.02, decay: 0.15, sustain: 0, release: 0.1 },
      volume: -22,
    }).toDestination();
    const filter = new Tone.AutoFilter({ frequency: 8, baseFrequency: 400, octaves: 4 }).toDestination();
    noise.disconnect();
    noise.connect(filter);
    filter.start();
    noise.triggerAttackRelease("8n");
    setTimeout(() => { noise.dispose(); filter.dispose(); }, 1000);
  },
  async noGains() {
    if (!await this._ensure()) return;
    // Sad descending tone
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.05, release: 0.5 },
      volume: -14,
    }).toDestination();
    const now = Tone.now();
    synth.triggerAttackRelease("E4", "8n", now);
    synth.triggerAttackRelease("C4", "8n", now + 0.2);
    setTimeout(() => synth.dispose(), 1500);
  },
  async injury() {
    if (!await this._ensure()) return;
    // Harsh buzz + descending tone
    const synth = new Tone.Synth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.3 },
      volume: -16,
    }).toDestination();
    const now = Tone.now();
    synth.triggerAttackRelease("D3", "16n", now);
    synth.triggerAttackRelease("Bb2", "8n", now + 0.1);
    setTimeout(() => synth.dispose(), 1500);
  },
  async duoBoost() {
    if (!await this._ensure()) return;
    // Double chime — two harmonized ascending tones
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.5 },
      volume: -10,
    }).toDestination();
    const now = Tone.now();
    synth.triggerAttackRelease(["C5", "E5"], "16n", now);
    synth.triggerAttackRelease(["E5", "G5"], "16n", now + 0.08);
    synth.triggerAttackRelease(["G5", "C6"], "8n", now + 0.16);
    synth.triggerAttackRelease(["C6", "E6"], "8n", now + 0.28);
    setTimeout(() => synth.dispose(), 2000);
  },
  async breakthrough() {
    if (!await this._ensure()) return;
    // Epic fanfare for high-stat gains — ascending power chord cascade
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.25, sustain: 0.15, release: 0.6 },
      volume: -12,
    }).toDestination();
    const filter = new Tone.Filter(3000, "lowpass").toDestination();
    synth.disconnect();
    synth.connect(filter);
    const now = Tone.now();
    synth.triggerAttackRelease(["C4","E4","G4"], "8n", now);
    synth.triggerAttackRelease(["E4","G4","C5"], "8n", now + 0.12);
    synth.triggerAttackRelease(["G4","C5","E5"], "8n", now + 0.24);
    synth.triggerAttackRelease(["C5","E5","G5"], "4n", now + 0.38);
    setTimeout(() => { synth.dispose(); filter.dispose(); }, 2500);
  },
  async progress() {
    if (!await this._ensure()) return;
    // Soft tick — subtle confirmation that progress happened
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.1, sustain: 0.02, release: 0.2 },
      volume: -18,
    }).toDestination();
    synth.triggerAttackRelease("A4", "32n");
    setTimeout(() => synth.dispose(), 800);
  },
  async whistle() {
    if (!await this._ensure()) return;
    const synth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.01, decay: 0.08, sustain: 0.3, release: 0.2 },
      volume: -14,
    }).toDestination();
    const now = Tone.now();
    synth.triggerAttackRelease("E6", "8n", now);
    synth.triggerAttackRelease("E6", "4n", now + 0.2);
    setTimeout(() => synth.dispose(), 1500);
  },
  async goal() {
    if (!await this._ensure()) return;
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.2, release: 0.4 },
      volume: -14,
    }).toDestination();
    const now = Tone.now();
    synth.triggerAttackRelease(["C4","E4","G4"], "8n", now);
    synth.triggerAttackRelease(["E4","G4","C5"], "8n", now + 0.15);
    synth.triggerAttackRelease(["G4","C5","E5"], "4n", now + 0.3);
    setTimeout(() => synth.dispose(), 2000);
  },
  async achievement() {
    if (!await this._ensure()) return;
    // Gentle slow-build unlock chime — soft rising hum into warm resolved chord
    const hum = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.3, decay: 0.4, sustain: 0.2, release: 0.8 },
      volume: -20,
    }).toDestination();
    const now = Tone.now();
    hum.triggerAttackRelease("D4", "2n", now);

    const chime = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.05, decay: 0.25, sustain: 0.05, release: 0.5 },
      volume: -16,
    }).toDestination();
    chime.triggerAttackRelease("F#4", "8n", now + 0.25);
    chime.triggerAttackRelease("A4", "8n", now + 0.45);
    chime.triggerAttackRelease("D5", "8n", now + 0.65);

    const bloom = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.15, decay: 0.5, sustain: 0.1, release: 1.2 },
      volume: -18,
    }).toDestination();
    bloom.triggerAttackRelease(["D5", "F#5", "A5"], "2n", now + 0.85);

    const sparkle = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.05, decay: 0.6, sustain: 0.0, release: 0.8 },
      volume: -22,
    }).toDestination();
    sparkle.triggerAttackRelease("A5", "4n", now + 1.1);

    setTimeout(() => { hum.dispose(); chime.dispose(); bloom.dispose(); sparkle.dispose(); }, 4000);
  },
  async playerUnlock() {
    if (!await this._ensure()) return;
    // Epic reveal — dramatic drum hit into rising fanfare with choir-like sustain
    const hit = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 },
      volume: -12,
    }).toDestination();
    hit.triggerAttackRelease("16n");

    const bass = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.05, decay: 0.4, sustain: 0.3, release: 1.0 },
      volume: -14,
    }).toDestination();
    const now = Tone.now();
    bass.triggerAttackRelease("C3", "2n", now + 0.1);

    const fanfare = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.15, release: 0.6 },
      volume: -10,
    }).toDestination();
    fanfare.triggerAttackRelease(["C4", "E4"], "8n", now + 0.3);
    fanfare.triggerAttackRelease(["E4", "G4"], "8n", now + 0.5);
    fanfare.triggerAttackRelease(["G4", "C5"], "8n", now + 0.7);
    fanfare.triggerAttackRelease(["C5", "E5", "G5"], "4n", now + 0.9);

    const shimmer = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.2, decay: 0.8, sustain: 0.2, release: 1.5 },
      volume: -16,
    }).toDestination();
    shimmer.triggerAttackRelease(["C5", "E5", "G5", "C6"], "1n", now + 1.2);

    setTimeout(() => { hit.dispose(); bass.dispose(); fanfare.dispose(); shimmer.dispose(); }, 5000);
  },
  async promotion() {
    if (!await this._ensure()) return;
    const now = Tone.now();

    const build = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.1, release: 0.3 },
      volume: -14,
    }).toDestination();
    build.triggerAttackRelease("C4", "16n", now);
    build.triggerAttackRelease("D4", "16n", now + 0.12);
    build.triggerAttackRelease("E4", "16n", now + 0.24);
    build.triggerAttackRelease("F4", "16n", now + 0.36);
    build.triggerAttackRelease("G4", "16n", now + 0.48);

    const restart = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.12, sustain: 0.1, release: 0.2 },
      volume: -12,
    }).toDestination();
    restart.triggerAttackRelease("C4", "16n", now + 0.8);
    restart.triggerAttackRelease("E4", "16n", now + 0.92);
    restart.triggerAttackRelease("G4", "16n", now + 1.04);
    restart.triggerAttackRelease("C5", "16n", now + 1.16);
    restart.triggerAttackRelease("E5", "16n", now + 1.28);

    const hit = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.15 },
      volume: -14,
    }).toDestination();
    hit.triggerAttackRelease("16n", now + 1.5);

    const bass = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.03, decay: 0.5, sustain: 0.3, release: 1.0 },
      volume: -12,
    }).toDestination();
    bass.triggerAttackRelease("C3", "2n", now + 1.5);

    const fanfare = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.2, release: 0.8 },
      volume: -14,
    }).toDestination();
    fanfare.triggerAttackRelease(["C5", "E5", "G5"], "4n", now + 1.55);
    fanfare.triggerAttackRelease(["E5", "G5", "C6"], "2n", now + 1.85);

    const shimmer = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.3, decay: 1.0, sustain: 0.15, release: 2.0 },
      volume: -18,
    }).toDestination();
    shimmer.triggerAttackRelease(["C5", "E5", "G5", "C6"], "1n", now + 2.0);

    setTimeout(() => { build.dispose(); restart.dispose(); hit.dispose(); bass.dispose(); fanfare.dispose(); shimmer.dispose(); }, 6000);
  },
  async champion() {
    if (!await this._ensure()) return;
    const now = Tone.now();

    const rumble = new Tone.NoiseSynth({
      noise: { type: "brown" },
      envelope: { attack: 0.1, decay: 1.2, sustain: 0.3, release: 0.5 },
      volume: -16,
    }).toDestination();
    rumble.triggerAttackRelease("2n", now);

    const brass = new Tone.Synth({
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.03, decay: 0.2, sustain: 0.15, release: 0.4 },
      volume: -14,
    }).toDestination();
    const filter = new Tone.Filter(3000, "lowpass").toDestination();
    brass.disconnect(); brass.connect(filter);
    brass.triggerAttackRelease("G3", "8n", now + 0.6);
    brass.triggerAttackRelease("C4", "8n", now + 0.8);
    brass.triggerAttackRelease("E4", "8n", now + 1.0);
    brass.triggerAttackRelease("G4", "8n", now + 1.2);

    const hit = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.003, decay: 0.3, sustain: 0, release: 0.2 },
      volume: -10,
    }).toDestination();
    hit.triggerAttackRelease("8n", now + 1.5);

    const bass = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.02, decay: 0.6, sustain: 0.4, release: 1.5 },
      volume: -10,
    }).toDestination();
    bass.triggerAttackRelease("C2", "1n", now + 1.5);

    const fanfare = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 1.0 },
      volume: -12,
    }).toDestination();
    fanfare.triggerAttackRelease(["C5", "E5", "G5"], "4n", now + 1.55);
    fanfare.triggerAttackRelease(["E5", "G5", "B5"], "4n", now + 1.95);
    fanfare.triggerAttackRelease(["G5", "C6", "E6"], "2n", now + 2.35);

    const choir = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.4, decay: 1.5, sustain: 0.2, release: 2.5 },
      volume: -16,
    }).toDestination();
    choir.triggerAttackRelease(["C5", "E5", "G5", "C6", "E6"], "1n", now + 2.8);

    const sparkle = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.05, decay: 0.5, sustain: 0, release: 0.8 },
      volume: -20,
    }).toDestination();
    sparkle.triggerAttackRelease("E6", "8n", now + 3.2);
    sparkle.triggerAttackRelease("G6", "8n", now + 3.5);
    sparkle.triggerAttackRelease("C7", "4n", now + 3.8);

    setTimeout(() => { rumble.dispose(); brass.dispose(); filter.dispose(); hit.dispose(); bass.dispose(); fanfare.dispose(); choir.dispose(); sparkle.dispose(); }, 8000);
  },
  async ovrUp() {
    if (!await this._ensure()) return;
    // Power-up level chime — crisp ascending scale into resolved power chord with shimmer
    const now = Tone.now();
    const scale = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.08, sustain: 0.05, release: 0.15 },
      volume: -12,
    }).toDestination();
    const notes = ["C4","D4","E4","F4","G4","A4","B4","C5"];
    notes.forEach((n, i) => scale.triggerAttackRelease(n, "32n", now + i * 0.04));
    const chord = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.8 },
      volume: -10,
    }).toDestination();
    const filter = new Tone.Filter(4000, "lowpass").toDestination();
    chord.disconnect(); chord.connect(filter);
    chord.triggerAttackRelease(["C5","E5","G5","C6"], "4n", now + 0.35);
    const sparkle = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.1, decay: 0.8, sustain: 0, release: 1.0 },
      volume: -20,
    }).toDestination();
    sparkle.triggerAttackRelease("E6", "2n", now + 0.6);
    sparkle.triggerAttackRelease("G6", "2n", now + 0.75);
    setTimeout(() => { scale.dispose(); chord.dispose(); filter.dispose(); sparkle.dispose(); }, 4000);
  },
  async arcStep() {
    if (!await this._ensure()) return;
    // Punchy 8-bit bass success — short ascending bassline with square wave
    const bass = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.01, decay: 0.12, sustain: 0.08, release: 0.2 },
      volume: -10,
    }).toDestination();
    const filter = new Tone.Filter(800, "lowpass").toDestination();
    bass.disconnect();
    bass.connect(filter);
    const now = Tone.now();
    bass.triggerAttackRelease("C3", "16n", now);
    bass.triggerAttackRelease("E3", "16n", now + 0.1);
    bass.triggerAttackRelease("G3", "16n", now + 0.2);
    bass.triggerAttackRelease("C4", "8n", now + 0.3);
    const chime = new Tone.Synth({
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.2, sustain: 0.05, release: 0.4 },
      volume: -16,
    }).toDestination();
    chime.triggerAttackRelease("G5", "8n", now + 0.35);
    setTimeout(() => { bass.dispose(); filter.dispose(); chime.dispose(); }, 1500);
  },
};

// ==================== BGM (Background Music) ====================

export const BGM_TRACKS = [
  { id: "home", title: "Home", file: "Home.mp3" },
  { id: "training", title: "Training", file: "Training.mp3" },
  { id: "forgot_kit", title: "Forgot Kit", file: "Forgot_Kit.mp3" },
  { id: "gone_up_one", title: "Gone Up One", file: "Gone_Up_One.mp3" },
  { id: "takeover_bid", title: "Takeover Bid", file: "Takeover_Bid.mp3" },
  { id: "chairmans_office", title: "Chairman's Office", file: "Chairmans_Office.mp3" },
  { id: "ice_bath", title: "Ice Bath", file: "Ice_Bath.mp3" },
  { id: "clubman_cup", title: "Clubman Cup", file: "Clubman_Cup.mp3" },
  { id: "shootout", title: "Shootout", file: "Shootout.mp3" },
];

export const BGM = {
  audio: null,
  gainNode: null,
  _audioCtxSource: null,
  playlist: [],
  playlistIdx: 0,
  _volume: 0.4,
  enabled: true,
  disabledTracks: new Set(),
  _started: false,
  _listenersBound: false,

  _init() {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.addEventListener("ended", () => this.next());
      this.audio.addEventListener("error", () => {
        setTimeout(() => this.next(), 300);
      });
    }
    // Route through Web Audio API for volume control (iOS ignores audio.volume)
    if (!this.gainNode && typeof Tone !== "undefined" && Tone.context) {
      try {
        const ctx = Tone.context.rawContext || Tone.context._context || Tone.context;
        this._audioCtxSource = ctx.createMediaElementSource(this.audio);
        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = this._volume;
        this._audioCtxSource.connect(this.gainNode);
        this.gainNode.connect(ctx.destination);
      } catch (e) {
        console.warn("BGM gain node failed:", e);
      }
    }
  },

  _bindFirstInteraction() {
    if (this._listenersBound) return;
    this._listenersBound = true;
    const start = async () => {
      document.removeEventListener("click", start, true);
      document.removeEventListener("touchstart", start, true);
      document.removeEventListener("keydown", start, true);
      if (typeof Tone !== "undefined" && Tone.context.state !== "running") {
        try { await Tone.start(); } catch {}
      }
      if (this.enabled && !this._started) {
        this._init();
        this._started = true;
        this.shuffle();
        this.audio.src = this._getTrackUrl();
        if (this.audio.src) this.audio.play().catch(() => {});
      }
    };
    document.addEventListener("click", start, true);
    document.addEventListener("touchstart", start, true);
    document.addEventListener("keydown", start, true);
  },

  _getTrackUrl() {
    if (this.playlistIdx >= this.playlist.length) return "";
    const trackId = this.playlist[this.playlistIdx];
    const track = BGM_TRACKS.find(t => t.id === trackId);
    return track ? `./${track.file}` : "";
  },

  setVolume(v) {
    this._volume = v;
    if (this.gainNode) {
      this.gainNode.gain.value = v;
    }
    if (this.audio && !this.gainNode) this.audio.volume = v;
  },

  setEnabled(on) {
    this.enabled = on;
    if (!this.audio) this._init();
    if (on) {
      if (this._started && this.audio.paused && this.audio.src) {
        this.audio.play().catch(() => {});
      }
    } else {
      if (this.audio && !this.audio.paused) {
        this.audio.pause();
      }
    }
  },

  setDisabledTracks(set) {
    this.disabledTracks = set;
    if (this.playlist[this.playlistIdx] && set.has(this.playlist[this.playlistIdx])) {
      this.next();
    }
  },

  getEnabledTracks() {
    return BGM_TRACKS.filter(t => !this.disabledTracks.has(t.id));
  },

  shuffle() {
    const enabled = this.getEnabledTracks();
    if (enabled.length === 0) { this.playlist = []; return; }
    const ids = enabled.map(t => t.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    this.playlist = ids;
    this.playlistIdx = 0;
  },

  next() {
    if (!this.enabled || !this.audio) return;
    this.playlistIdx++;
    const enabled = this.getEnabledTracks();
    if (enabled.length === 0) return;
    if (this.playlistIdx >= this.playlist.length) {
      this.shuffle();
    }
    let attempts = 0;
    while (this.disabledTracks.has(this.playlist[this.playlistIdx]) && attempts < this.playlist.length) {
      this.playlistIdx++;
      if (this.playlistIdx >= this.playlist.length) this.shuffle();
      attempts++;
    }
    if (attempts >= this.playlist.length) return;
    this.audio.src = this._getTrackUrl();
    if (this.audio.src) this.audio.play().catch(() => {});
  },

  getCurrentTrackId() {
    return this.playlist[this.playlistIdx] || null;
  },
};
