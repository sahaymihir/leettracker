import * as usersRepo from '../repositories/usersRepo.js';
import { runSync } from '../controllers/leetcodeController.js';

// Auto-sync batch runner, invoked once per day at end-of-day (UTC) by the
// scheduled Lambda (lambda-autosync.js). EventBridge owns *when* this runs;
// this runner only decides *who* is eligible.
//
// Cadences (User.syncPreference):
//   'end_of_day'      — synced once per UTC day by the daily schedule
//   'manual' / absent — never auto-synced (user clicks "Sync now" instead)
//
// Group targeting is intentionally empty for auto-sync: the per-user "add to
// groups" selection lives in browser localStorage (client-side) and isn't
// available server-side. Auto-sync still imports problems; it just doesn't
// auto-add them to groups. A manual "Sync now" from the UI keeps that behavior.

const utcDayKey = (date) => date.toISOString().slice(0, 10);

// Decide whether a user is due for an auto-sync at instant `now`.
// EventBridge fires this once per day at end-of-day UTC; the UTC-day guard just
// makes re-fires/retries idempotent so a user isn't synced twice in one day.
export const isDue = (user, now = new Date()) => {
  if (user.syncPreference !== 'end_of_day') return false;
  if (!user.leetcodeUsername?.trim()) return false;

  const last = user.lastSyncedAt ? new Date(user.lastSyncedAt) : null;
  if (!last || Number.isNaN(last.getTime())) return true;
  return utcDayKey(last) !== utcDayKey(now);
};

// Scan all users and sync the ones that are due. Returns a summary for logging.
// Per-user failures are caught so one bad profile can't abort the whole batch.
export const runAutoSync = async (now = new Date()) => {
  const users = await usersRepo.listAll();
  const due = users.filter((u) => isDue(u, now));

  let synced = 0;
  let failed = 0;
  const failures = [];

  for (const user of due) {
    try {
      await runSync(user.email, { groupIds: [] });
      synced++;
    } catch (err) {
      failed++;
      failures.push({ email: user.email, error: err.message });
      console.error(`Auto-sync failed for ${user.email}:`, err.message);
    }
  }

  return { scanned: users.length, due: due.length, synced, failed, failures };
};
