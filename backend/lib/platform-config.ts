// Phase 7 Slice H — runtime platform config with caching.
//
// Two callers care about latency: fundCampaign (every campaign-funding
// USDC verify) and the founding-seat pricing endpoint (every /premium
// page load). DB hit per call was unnecessary, so we cache values
// in-process for 60 seconds. Admin updates invalidate the cache so
// they take effect immediately for the writing process; other PM2
// workers see the change at the next 60s tick (acceptable for an
// occasional config bump).

import { eq } from "drizzle-orm";
import { db } from "../db";
import { platformConfig } from "../../shared/schema";

interface CacheEntry {
  value: string;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

// Defaults — used when the row is missing entirely (fresh DB before
// migration runs, or test environments without the table). Keep in
// sync with the INSERTs in migration 0026.
const DEFAULTS: Record<string, string> = {
  platform_fee_bps: "2000",
  founding_seats_total: "50",
  founding_price_usdc: "15.00",
  post_founding_price_usdc: "29.00",
};

async function readFresh(key: string): Promise<string> {
  const [row] = await db
    .select({ value: platformConfig.value })
    .from(platformConfig)
    .where(eq(platformConfig.key, key))
    .limit(1);
  if (row?.value !== undefined) return row.value;
  return DEFAULTS[key] ?? "";
}

export async function getConfig(key: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }
  const value = await readFresh(key);
  cache.set(key, { value, fetchedAt: now });
  return value;
}

export async function getConfigInt(key: string): Promise<number> {
  const v = await getConfig(key);
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : 0;
}

export async function getConfigFloat(key: string): Promise<number> {
  const v = await getConfig(key);
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Convenience reads for the two hot-path levers.
export async function getPlatformFeeRate(): Promise<number> {
  const bps = await getConfigInt("platform_fee_bps");
  return bps / 10_000; // 2000 bps → 0.20
}

export async function getFoundingSeatsTotal(): Promise<number> {
  return await getConfigInt("founding_seats_total");
}

export async function getFoundingPriceUsdc(): Promise<string> {
  return await getConfig("founding_price_usdc");
}

export async function getPostFoundingPriceUsdc(): Promise<string> {
  return await getConfig("post_founding_price_usdc");
}

// Admin write path — upsert + invalidate the local cache. Other PM2
// workers see the update at the next tick of their own cache (≤60s).
export async function setConfig(
  key: string,
  value: string,
  updatedBy: string,
): Promise<void> {
  await db
    .insert(platformConfig)
    .values({ key, value, updatedBy, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: platformConfig.key,
      set: { value, updatedBy, updatedAt: new Date() },
    });
  cache.delete(key);
}

// Read every known config key for the admin /admin/config page.
// Returns defaults for keys that have no row yet.
export async function listAllConfig(): Promise<
  Array<{ key: string; value: string; description: string | null }>
> {
  const rows = await db
    .select({
      key: platformConfig.key,
      value: platformConfig.value,
      description: platformConfig.description,
    })
    .from(platformConfig);
  const present = new Map(rows.map((r) => [r.key, r]));
  // Make sure all known defaults show even if the row hasn't been
  // created yet.
  const out = Object.keys(DEFAULTS).map((key) => {
    const row = present.get(key);
    return {
      key,
      value: row?.value ?? DEFAULTS[key],
      description: row?.description ?? null,
    };
  });
  // Include any custom keys an admin added later that aren't in DEFAULTS.
  for (const row of rows) {
    if (!DEFAULTS[row.key]) out.push(row);
  }
  return out;
}
