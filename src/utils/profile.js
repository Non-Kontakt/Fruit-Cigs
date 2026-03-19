// Profile system utilities — per-user local accounts with isolated save slots, achievements, museum

const PROFILES_KEY = "jfg-profiles";
const profileKey = (id) => `jfg-profile-${id}`;
export const getSaveKey = (profileId, slot) => `jfg-save-${profileId}-${slot}`;

const genId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function listProfiles() {
  try {
    const res = await window.storage.get(PROFILES_KEY);
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
  await window.storage.set(PROFILES_KEY, JSON.stringify(profiles));
  await window.storage.set(profileKey(id), JSON.stringify(profile));
  return profile;
}

export async function readProfile(profileId) {
  try {
    const res = await window.storage.get(profileKey(profileId));
    if (!res) return null;
    return JSON.parse(res.value);
  } catch { return null; }
}

export async function writeProfile(profileId, data) {
  await window.storage.set(profileKey(profileId), JSON.stringify(data));
}

export async function deleteProfile(profileId) {
  const profiles = await listProfiles();
  const updated = profiles.filter(p => p.id !== profileId);
  await window.storage.set(PROFILES_KEY, JSON.stringify(updated));
  await window.storage.delete(profileKey(profileId));
  // Delete all 3 save slots for this profile
  for (let i = 1; i <= 3; i++) {
    try { await window.storage.delete(getSaveKey(profileId, i)); } catch { /* ok */ }
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

export async function updateProfileIronmanVersion(profileId, version, slot) {
  try {
    const profile = await readProfile(profileId);
    if (!profile) return;
    // Track per-slot so starting a new career in a different slot doesn't poison the check
    const slotVersions = profile.slotVersions || {};
    const slotKey = String(slot || 0);
    if (version > (slotVersions[slotKey] || 0)) {
      profile.slotVersions = { ...slotVersions, [slotKey]: version };
      // Keep the global field for backwards compat (not used for integrity check)
      profile.lastIronmanVersion = Math.max(profile.lastIronmanVersion || 0, version);
      await writeProfile(profileId, profile);
    }
  } catch { /* non-critical */ }
}

// Force-sync profile slot version to match a loaded save.
// Called after the integrity check on load to prevent false positives
// from the old race condition where profile could get ahead of save data.
export async function syncProfileIronmanVersion(profileId, version, slot) {
  try {
    const profile = await readProfile(profileId);
    if (!profile) return;
    const slotVersions = profile.slotVersions || {};
    const slotKey = String(slot || 0);
    profile.slotVersions = { ...slotVersions, [slotKey]: version };
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

export function checkIronmanIntegrity(save, profile, slot) {
  if (!save || !profile) return { valid: true };
  // Version 0 in save means no auto-save has happened yet — always valid
  const saveVersion = save.ironmanSaveVersion || 0;
  if (saveVersion === 0) return { valid: true };
  // Use per-slot version to avoid false positives when starting a new career in a different slot
  const slotVersions = profile.slotVersions || {};
  const slotKey = String(slot || 0);
  const profileVersion = slotVersions[slotKey] || 0;
  // Allow a small gap (≤2) to tolerate race conditions where auto-save updates
  // the profile version but a crash/reload prevents the save file from being written.
  // Real save-scumming shows a much larger version gap.
  if (saveVersion < profileVersion - 2) {
    return { valid: false, reason: `Save version (${saveVersion}) predates furthest progress (${profileVersion})` };
  }
  return { valid: true };
}

export async function scanProfileSlots(profileId) {
  const summaries = [null, null, null];
  for (let i = 1; i <= 3; i++) {
    try {
      const result = await window.storage.get(getSaveKey(profileId, i));
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
