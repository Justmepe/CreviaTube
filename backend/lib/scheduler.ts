import { runSubscriptionExpiryJob } from "../jobs/subscription-expiry";

/**
 * Lightweight scheduler. Avoids adding node-cron — for now we run daily jobs on
 * a setInterval that fires once at boot (after a short delay) and then every 24h.
 * If we add more jobs later we can migrate to node-cron for finer schedules.
 */

const DAILY_MS = 24 * 60 * 60_000;
const STARTUP_DELAY_MS = 30_000; // 30s after boot — let migrations + auto-sync settle first

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

  console.log("⏰ Starting daily scheduler");

  const runAll = async (label: string) => {
    console.log(`⏰ [scheduler] tick (${label})`);
    try {
      await runSubscriptionExpiryJob();
    } catch (err) {
      console.error("⏰ subscription-expiry job failed:", err);
    }
  };

  // First run after delay
  timers.push(setTimeout(() => {
    void runAll("startup");
    timers.push(setInterval(() => void runAll("daily"), DAILY_MS));
  }, STARTUP_DELAY_MS));
}

export function stopScheduler(): void {
  for (const t of timers) clearTimeout(t as any);
  timers.length = 0;
  started = false;
}
