import { useState, useEffect } from "react";
import { SFX, BGM } from "../utils/sfx.js";

/**
 * Manages all user-configurable settings and keeps external audio systems
 * (SFX, BGM) in sync. Also provides a single `loadSettings(saveData)` helper
 * so the load-game path only needs one call instead of eight individual setters.
 */
export function useSettings() {
  const [matchSpeed, setMatchSpeed] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [trainingCardSpeed, setTrainingCardSpeed] = useState("full"); // "full" | "quick" | "summary"
  const [matchDetail, setMatchDetail] = useState("full"); // "full" | "highlights"
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.4);
  const [disabledTracks, setDisabledTracks] = useState(new Set());
  const [instantMatch, setInstantMatch] = useState(false); // Skip match commentary delay

  // Bind BGM to first user interaction (enables audio context on mobile/strict browsers)
  useEffect(() => { BGM._bindFirstInteraction(); }, []);

  // Keep audio systems in sync with settings
  useEffect(() => { SFX.muted = !soundEnabled; }, [soundEnabled]);
  useEffect(() => { BGM.setEnabled(musicEnabled); }, [musicEnabled]);
  useEffect(() => { BGM.setVolume(musicVolume); }, [musicVolume]);
  useEffect(() => { BGM.setDisabledTracks(disabledTracks); }, [disabledTracks]);

  /** Restore all settings from a save-data object (values missing from older saves are silently ignored). */
  function loadSettings(s) {
    setMatchSpeed(s.matchSpeed || 1);
    if (s.soundEnabled !== undefined) setSoundEnabled(s.soundEnabled);
    if (s.autoSaveEnabled !== undefined) setAutoSaveEnabled(s.autoSaveEnabled);
    if (s.trainingCardSpeed) setTrainingCardSpeed(s.trainingCardSpeed);
    if (s.matchDetail) setMatchDetail(s.matchDetail);
    if (s.musicEnabled !== undefined) setMusicEnabled(s.musicEnabled);
    if (s.musicVolume !== undefined) {
      setMusicVolume(s.musicVolume);
      BGM._volume = s.musicVolume; // update internal volume before next track starts
    }
    if (s.disabledTracks) {
      const dt = new Set(s.disabledTracks);
      setDisabledTracks(dt);
      BGM.disabledTracks = dt;
    }
    if (s.instantMatch !== undefined) setInstantMatch(s.instantMatch);
  }

  return {
    matchSpeed, setMatchSpeed,
    soundEnabled, setSoundEnabled,
    autoSaveEnabled, setAutoSaveEnabled,
    trainingCardSpeed, setTrainingCardSpeed,
    matchDetail, setMatchDetail,
    musicEnabled, setMusicEnabled,
    musicVolume, setMusicVolume,
    disabledTracks, setDisabledTracks,
    instantMatch, setInstantMatch,
    loadSettings,
  };
}
