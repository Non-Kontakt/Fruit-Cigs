/**
 * Inbox message utilities — creation, visibility, sorting, querying.
 *
 * Write side:  createInboxMessage()  — single factory for all inbox messages
 * Read side:   getVisibleMessages()  — filtered + sorted, ready to render
 *              getUnreadCount()      — visible unread count
 *              isMessageVisible()    — low-level visibility predicate
 * Persistence: seedMessageSeq()      — reseed on load
 *              getMessageSeq()       — snapshot for save
 */

// ---------------------------------------------------------------------------
// Monotonic sequence counter — ensures stable sort order across sessions.
// Module-level; re-seeded on load via seedMessageSeq().
// ---------------------------------------------------------------------------
let _nextSeq = 0;

// ---------------------------------------------------------------------------
// Write side
// ---------------------------------------------------------------------------

/**
 * Create an inbox message with auto-stamped time context and monotonic ordering.
 *
 * @param {object} fields   — message content (icon, title, body, color, …)
 * @param {object} timeCtx  — { calendarIndex, seasonNumber }
 * @returns {object} complete message object ready for setInboxMessages
 *
 * Auto-filled fields (overridable via `fields`):
 *   read    — false
 *   week    — timeCtx.calendarIndex + 1  (1-based display week)
 *   season  — timeCtx.seasonNumber
 *   seq     — _nextSeq++
 *   id      — `msg_${Date.now()}_${seq}` (if not provided)
 *
 * Special field:
 *   visibleFromIndex — maps to internal `pendingUntilWeek` for save compat.
 *                      Use this instead of pendingUntilWeek in new code.
 */
export function createInboxMessage(fields, timeCtx) {
  const seq = _nextSeq++;
  const msg = {
    read: false,
    week: timeCtx.calendarIndex + 1,
    season: timeCtx.seasonNumber,
    seq,
    id: fields.id || `msg_${Date.now()}_${seq}`,
    ...fields,
  };
  if (fields.visibleFromIndex != null && fields.pendingUntilWeek == null) {
    msg.pendingUntilWeek = fields.visibleFromIndex;
    delete msg.visibleFromIndex;
  }
  return msg;
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

/** Reseed the sequence counter — call on load / slot-switch. */
export function seedMessageSeq(seq) { _nextSeq = seq; }

/** Snapshot the current counter — call on save. */
export function getMessageSeq() { return _nextSeq; }

// ---------------------------------------------------------------------------
// Read side
// ---------------------------------------------------------------------------

/**
 * Check if a message should be visible given the current calendarIndex.
 * Messages with `pendingUntilWeek` are hidden until calendarIndex >= that value.
 */
export function isMessageVisible(msg, calendarIndex = 0) {
  return !msg.pendingUntilWeek || calendarIndex >= msg.pendingUntilWeek;
}

/**
 * Canonical sort comparator for inbox messages.
 * Season DESC → week DESC → seq DESC.
 * Messages without seq (old saves) sort to the end within their week.
 */
export function inboxSort(a, b) {
  const sDiff = (b.season || 1) - (a.season || 1);
  if (sDiff !== 0) return sDiff;
  const wDiff = (b.week || 1) - (a.week || 1);
  if (wDiff !== 0) return wDiff;
  return (b.seq ?? -1) - (a.seq ?? -1);
}

/** Visible messages, sorted and ready to render. */
export function getVisibleMessages(inboxMessages, calendarIndex) {
  if (!inboxMessages) return [];
  return inboxMessages
    .filter(m => isMessageVisible(m, calendarIndex))
    .sort(inboxSort);
}

/** Count of visible, unread messages. */
export function getUnreadCount(inboxMessages, calendarIndex) {
  if (!inboxMessages) return 0;
  return inboxMessages.filter(m => !m.read && isMessageVisible(m, calendarIndex)).length;
}
