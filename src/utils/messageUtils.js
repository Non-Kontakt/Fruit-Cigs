/**
 * Message visibility and filtering utilities
 * Centralizes the logic for checking if a message should be visible based on pendingUntilWeek
 */

/**
 * Check if a message should be visible given the current week
 * Messages can be marked as pending until a certain week, at which point they become visible
 * @param {Object} msg - The message object
 * @param {number} msg.pendingUntilWeek - Optional week number until which the message is hidden
 * @param {number} currentWeek - The current week number (defaults to 1 if not provided)
 * @returns {boolean} - True if the message should be visible, false otherwise
 */
export function isMessageVisible(msg, currentWeek = 1) {
  return !msg.pendingUntilWeek || currentWeek >= msg.pendingUntilWeek;
}

/**
 * Enumeration of all message types found in the codebase
 * Used for documentation and type checking of inbox messages
 */
export const MESSAGE_TYPES = {
  WELCOME: "welcome",
  BOARD_EXPECTATIONS: "board_expectations",
  ASST_MGR_TRAINING_INTRO: "asst_mgr_training_intro",
  ASST_MGR_TRAINING_NUDGE: "asst_mgr_training_nudge",
  REPORTER_INTRO: "reporter_intro",
  LEAGUE_MODIFIER_INTRO: "league_modifier_intro",
  TRIAL_OFFER: "trial_offer",
  TRIAL_RIVAL: "trial_rival",
  TRIAL_FOLLOWUP: "trial_followup",
  PRODIGAL_SCOUT: "prodigal_scout",
  PRODIGAL_OFFER: "prodigal_offer",
  POACH_EVENT: "poach_event",
  LEAGUE_UPDATE: "msg_train_",
  MATCH_DAY_UPDATE: "msg_md_",
  CUP_UPDATE: "msg_cup_",
  LOPSIDED_UPDATE: "msg_lopsided_",
};
