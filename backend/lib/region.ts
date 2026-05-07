// Country ↔ continent mapping for the regional-targeting flow.
// ISO 3166-1 alpha-2 country codes; continents collapsed to the seven we
// expose to campaigners (NA, SA, EU, AF, AS, OC, AN).
//
// We only enumerate the countries that v1 actually surfaces in the UI
// (campaign creation country picker + the countries clippers register
// from). Add to this list as the platform expands. The fallback for
// unknown codes is `null` — the caller decides how to handle.

export type ContinentCode = "NA" | "SA" | "EU" | "AF" | "AS" | "OC" | "AN";

export const COUNTRY_TO_CONTINENT: Record<string, ContinentCode> = {
  US: "NA", CA: "NA", MX: "NA",
  BR: "SA", AR: "SA", CO: "SA", PE: "SA", CL: "SA",
  GB: "EU", UK: "EU", DE: "EU", FR: "EU", ES: "EU", IT: "EU", NL: "EU", PL: "EU",
    IE: "EU", PT: "EU", SE: "EU", NO: "EU", FI: "EU", DK: "EU", BE: "EU", CH: "EU",
    AT: "EU", GR: "EU", CZ: "EU", HU: "EU", RO: "EU",
  KE: "AF", NG: "AF", ZA: "AF", EG: "AF", GH: "AF", TZ: "AF", UG: "AF", ET: "AF",
    MA: "AF", DZ: "AF", SN: "AF", CI: "AF", RW: "AF",
  IN: "AS", CN: "AS", JP: "AS", KR: "AS", TH: "AS", VN: "AS", ID: "AS", PH: "AS",
    SG: "AS", MY: "AS", PK: "AS", BD: "AS", AE: "AS", SA: "AS", IL: "AS", TR: "AS",
  AU: "OC", NZ: "OC",
};

/**
 * Normalize a country code: uppercase, validate against ISO alpha-2 shape.
 * Returns null if invalid or empty.
 */
export function normalizeCountry(code: string | null | undefined): string | null {
  if (!code || typeof code !== "string") return null;
  const upper = code.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(upper) ? upper : null;
}

/**
 * Returns true if the clipper's country matches the campaign's target
 * regions. Rules:
 *   - if targetRegions is empty/null, the campaign is open globally → true
 *   - if targetRegions contains the clipper's country code → true
 *   - if targetRegions contains the clipper's continent code → true
 *
 * Continent codes mix freely with country codes in the campaign config.
 */
export function clipperMatchesRegions(clipperCountry: string | null, targetRegions: string[] | null | undefined): boolean {
  const clean = (targetRegions || []).map((r) => r.toUpperCase()).filter(Boolean);
  if (clean.length === 0) return true; // global campaign

  const country = normalizeCountry(clipperCountry);
  if (!country) return false; // clipper hasn't been geolocated → can't match a targeted campaign

  if (clean.includes(country)) return true;

  const continent = COUNTRY_TO_CONTINENT[country];
  if (continent && clean.includes(continent)) return true;

  return false;
}

/**
 * Group a list of clipper country codes into a per-continent breakdown.
 * Used by the region-coverage endpoint so campaigners can see "I have
 * 12 clippers in AF, 8 in EU" at a glance.
 */
export function groupByContinent(countries: (string | null | undefined)[]): Record<ContinentCode | "unknown", number> {
  const out: Record<string, number> = {};
  for (const c of countries) {
    const norm = normalizeCountry(c);
    const cont = norm ? COUNTRY_TO_CONTINENT[norm] || "unknown" : "unknown";
    out[cont] = (out[cont] || 0) + 1;
  }
  return out as Record<ContinentCode | "unknown", number>;
}
