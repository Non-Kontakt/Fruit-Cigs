// Profile system utilities — per-user local accounts with isolated save slots, achievements, museum

import { storage } from "../persistence/storage.js";

const PROFILES_KEY = "jfg-profiles";
const profileKey = (id) => `jfg-profile-${id}`;
export const getSaveKey = (profileId, slot) => `jfg-save-${profileId}-${slot}`;

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// Minimal "is this payload a loadable save" gate, shared by the slot scan
// and loadGame so recovery decisions are consistent: parseable JSON with a
// teamName. Deeper repair stays in the load-time migrations.
export const isLoadableSave = (value) => {
  try { return !!(JSON.parse(value)?.teamName); } catch { return false; }
};

export async function listProfiles() {
  try {
    const res = await storage.get(PROFILES_KEY);
    if (!res) return [];
    return JSON.parse(res.value) || [];
  } catch { return []; }
}

export async function createProfile(name) {
  const id = genId();
  const now = new Date().toISOString();
  const profile = {
    id, name: name.trim(), createdAt: now,
    schemaVersion: 1,
    unlockedAchievements: [],
    achievementDates: {},
    ironmanCareers: 0,
    ironmanBest: null,
    lastIronmanVersion: 0,
    museum: [],
  };
  const profiles = await listProfiles();
  profiles.push({ id, name: name.trim(), createdAt: now });
  await storage.set(PROFILES_KEY, JSON.stringify(profiles));
  await storage.set(profileKey(id), JSON.stringify(profile));
  return profile;
}

export async function readProfile(profileId) {
  try {
    const res = await storage.get(profileKey(profileId));
    if (!res) return null;
    return JSON.parse(res.value);
  } catch { return null; }
}

export async function writeProfile(profileId, data) {
  await storage.set(profileKey(profileId), JSON.stringify(data));
}

export async function deleteProfile(profileId) {
  const profiles = await listProfiles();
  const updated = profiles.filter(p => p.id !== profileId);
  await storage.set(PROFILES_KEY, JSON.stringify(updated));
  await storage.delete(profileKey(profileId));
  // Purge all 3 save slots permanently — profile deletion leaves no
  // orphaned backups behind.
  for (let i = 1; i <= 3; i++) {
    try { await storage.purgeSave(getSaveKey(profileId, i)); } catch { /* ok */ }
  }
}

export async function unlockAchievementToProfile(profileId, achievementId) {
  try {
    const profile = await readProfile(profileId);
    if (!profile) return;
    if (profile.unlockedAchievements.includes(achievementId)) return;
    profile.unlockedAchievements.push(achievementId);
    profile.achievementDates[achievementId] = new Date().toISOString().slice(0, 10);
    await writeProfile(profileId, profile);
  } catch { /* non-critical */ }
}

export async function archiveCareerToMuseum(profileId, careerSnapshot) {
  try {
    const profile = await readProfile(profileId);
    if (!profile) return;
    profile.museum = profile.museum || [];
    profile.museum.push({ ...careerSnapshot, archivedAt: new Date().toISOString() });
    profile.ironmanCareers = (profile.ironmanCareers || 0) + 1;
    const seasons = careerSnapshot.seasonNumber || 1;
    const tier = careerSnapshot.leagueTier || 11;
    if (!profile.ironmanBest || seasons > profile.ironmanBest.seasons ||
        (seasons === profile.ironmanBest.seasons && tier < profile.ironmanBest.highestTier)) {
      profile.ironmanBest = { seasons, highestTier: tier, teamName: careerSnapshot.teamName };
    }
    await writeProfile(profileId, profile);
  } catch { /* non-critical */ }
}

export async function deleteMuseumEntry(profileId, archivedAt) {
  try {
    const profile = await readProfile(profileId);
    if (!profile) return;
    profile.museum = (profile.museum || []).filter(e => e.archivedAt !== archivedAt);
    await writeProfile(profileId, profile);
  } catch { /* non-critical */ }
}

export async function scanProfileSlots(profileId) {
  const summaries = [null, null, null];
  for (let i = 1; i <= 3; i++) {
    try {
      const result = await storage.getSave(getSaveKey(profileId, i), { validate: isLoadableSave });
      if (result) {
        const s = JSON.parse(result.value);
        if (s?.teamName) {
          summaries[i - 1] = {
            teamName: s.teamName,
            seasonNumber: s.seasonNumber || 1,
            leagueTier: s.leagueTier || 11,
            week: s.week || (s.calendarIndex || 0) + 1 || 1,
            gameMode: s.gameMode || "casual",
          };
        }
      }
    } catch { /* slot empty or corrupt */ }
  }
  return summaries;
}
