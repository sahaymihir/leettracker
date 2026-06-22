import * as usersRepo from '../repositories/usersRepo.js';
import { runSync } from '../controllers/leetcodeController.js';

// Auto-sync batch runner, invoked hourly by the scheduled Lambda
// (lambda-autosync.js). A single hourly tick drives both supported cadences;
// the decision of whether a given user is "due" lives here in code rather than
// in EventBridge, so cadences can change without touching infrastructure.
//
// Cadences (User.syncPreference):
//   'every_12h'  — sync when >= ~12h have elapsed since lastSyncedAt
//   'end_of_day' — sync once per day, during the end-of-day hour in IST
//   'manual' / absent — never auto-synced
//
// Group targeting is intentionally empty for auto-sync: the per-user "add to
// groups" selection lives in browser localStorage (client-side) and isn't
// available server-side. Auto-sync still imports problems; it just doesn't
// auto-add them to groups. A manual "Sync now" from the UI keeps that behavior.

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // UTC+5:30
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
// Fire end-of-day a touch under 12h so an hourly tick whose timing drifts
// slightly never skips a window.
const TWELVE_HOUR_MARGIN_MS = 30 * 60 * 1000;
// Hour (in IST, 0–23) at which 'end_of_day' users are synced. 23 = 11pm IST.
const END_OF_DAY_IST_HOUR = Number(process.env.AUTOSYNC_END_OF_DAY_IST_HOUR ?? 23);

// Shift a UTC instant into IST and read its calendar parts via UTC getters.
const toIstParts = (date) => {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    hour: ist.getUTCHours(),
    // YYYY-MM-DD of the IST calendar day, for "already synced today" checks.
    dayKey: ist.toISOString().slice(0, 10),
  };
};

// Decide whether a user is due for an auto-sync at instant `now`.
export const isDue = (user, now = new Date()) => {
  const pref = user.syncPreference;
  if (pref !== 'every_12h' && pref !== 'end_of_day') return false;
  if (!user.leetcodeUsername?.trim()) return false;

  const last = user.lastSyncedAt ? new Date(user.lastSyncedAt) : null;

  if (pref === 'every_12h') {
    if (!last || Number.isNaN(last.getTime())) return true;
    return now.getTime() - last.getTime() >= TWELVE_HOURS_MS - TWELVE_HOUR_MARGIN_MS;
  }

  // end_of_day: only during the end-of-day IST hour, and only once per IST day.
  const nowIst = toIstParts(now);
  if (nowIst.hour !== END_OF_DAY_IST_HOUR) return false;
  if (!last || Number.isNaN(last.getTime())) return true;
  return toIstParts(last).dayKey !== nowIst.dayKey;
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
