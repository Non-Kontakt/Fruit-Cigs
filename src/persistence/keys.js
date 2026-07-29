// The production persistence namespace and every key builder in one place.
// Nothing else in src/ builds a storage key from a string literal — the
// contract lives here or it doesn't exist.
//
// "fc" replaced the retired "jfg" (Jumpers for Goalposts) namespace in a
// clean cutover — no aliases, no dual reads. The jumpers_for_goalposts
// achievement and the strategy guide's homage are deliberate historical
// references, not stragglers.

export const PROFILES_KEY = "fc-profiles";
export const profileKey = (id) => `fc-profile-${id}`;
export const getSaveKey = (profileId, slot) => `fc-save-${profileId}-${slot}`;
export const SETTINGS_KEY = "fc-settings";
