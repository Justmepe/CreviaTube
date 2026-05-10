import { runSubscriptionExpiryJob } from "../jobs/subscription-expiry";
import { pollAllPostViews } from "../core/services/view-polling";

/**
 * Lightweight scheduler. Avoids adding node-cron — for now we run jobs on
 * setInterval timers that fire once at boot (after a short delay) and then
 * on a fixed cadence. If we add more jobs later we can migrate to node-cron
 * for finer schedules.
 *
 * Cadences today:
 *   daily         — subscription expiry warnings
 *   view-polling  — every VIEW_POLL_INTERVAL_MS (default 30 min). Polls
 *                    YouTube for cumulative view counts on approved
 *                    post URLs whose campaign primaryGoal is "views".
 */

const DAILY_MS = 24 * 60 * 60_000;
const STARTUP_DELAY_MS = 30_000; // 30s after boot — let migrations + auto-sync settle first
// Configurable so we can throttle in production (YouTube quota: 10k units/day,
// each videos.list call costs 1 unit per video). 30 min = 48 sweeps/day, so a
// campaign with N videos costs N*48 units/day.
const VIEW_POLL_INTERVAL_MS = parseInt(
  process.env.VIEW_POLL_INTERVAL_MS || String(30 * 60_000),
  10,
);

let started = false;
const timers: NodeJS.Timeout[] = [];

export function startScheduler(): void {
  if (started) return;
  started = true;

  // Allow opt-out for tests / cold dev
  if (process.env.SCHEDULER_DISABLED === "true") {
    console.log("⏰ Scheduler disabled (SCHEDULER_DISABLED=true)");
    return;
  }

  console.log("⏰ Starting scheduler (daily + view-polling)");

  const runDaily = async (label: string) => {
    console.log(`⏰ [scheduler] daily tick (${label})`);
    try {
      await runSubscriptionExpiryJob();
    } catch (err) {
      console.error("⏰ subscription-expiry job failed:", err);
    }
  };

  const runViewPoll = async (label: string) => {
    try {
      const result = await pollAllPostViews();
      // Only log when we did something interesting — the sweep runs often
      // and zero-result lines would dominate the logs.
      if (result.scanned > 0 || result.errors > 0) {
        console.log(`⏰ [scheduler] view-poll (${label})`, result);
      }
    } catch (err) {
      console.error("⏰ view-polling sweep failed:", err);
    }
  };

  // Daily jobs.
  timers.push(setTimeout(() => {
    void runDaily("startup");
    timers.push(setInterval(() => void runDaily("daily"), DAILY_MS));
  }, STARTUP_DELAY_MS));

  // View-polling jobs. Same startup delay so we don't dogpile API calls
  // during boot.
  timers.push(setTimeout(() => {
    void runViewPoll("startup");
    timers.push(setInterval(() => void runViewPoll("interval"), VIEW_POLL_INTERVAL_MS));
  }, STARTUP_DELAY_MS));
}

export function stopScheduler(): void {
  for (const t of timers) clearTimeout(t as any);
  timers.length = 0;
  started = false;
}
