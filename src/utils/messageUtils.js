/**
 * Message visibility and filtering utilities
 * Centralizes the logic for checking if a message should be visible based on pendingUntilWeek
 */

/**
 * Check if a message should be visible given the current calendarIndex
 * Messages can be marked as pending until a certain calendarIndex, at which point they become visible
 * @param {Object} msg - The message object
 * @param {number} msg.pendingUntilWeek - Optional calendarIndex value until which the message is hidden
 * @param {number} calendarIndex - The current calendarIndex (0-based, defaults to 0)
 * @returns {boolean} - True if the message should be visible, false otherwise
 */
export function isMessageVisible(msg, calendarIndex = 0) {
  return !msg.pendingUntilWeek || calendarIndex >= msg.pendingUntilWeek;
}
