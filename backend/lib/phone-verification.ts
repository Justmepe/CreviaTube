// Phone country-code verification (region tier 2). No SMS provider needed —
// we're not asserting ownership of the phone, just checking that the
// claimed country code is consistent with the IP-detected country.
//
// Tier 1 (signup): IP geolocation captures users.country_iso. Trustworthy
//                  but spoofable via VPN.
// Tier 2 (here):   Phone number country prefix matches IP country. If a US
//                  IP user provides a phone starting with +1, we mark
//                  country_verified_at — the consistency check is a real
//                  (if soft) signal. A VPN spoofer would also need a phone
//                  number from the spoofed country.
// Tier 3:          KYC document verification (separate scaffold).

// Map of E.164 country dialing codes → ISO 3166-1 alpha-2 candidates.
// One dialing code can map to multiple countries (NANP: +1 covers US, CA,
// and many Caribbean nations); a "match" is when the user's IP country is
// in the candidate set.
//
// Restricted to countries we currently surface in the UI / region.ts —
// extend in lockstep with that list.
const DIALING_CODES: Record<string, string[]> = {
  // North America (NANP)
  "1": ["US", "CA"],
  "52": ["MX"],

  // South America
  "55": ["BR"],
  "54": ["AR"],
  "57": ["CO"],
  "51": ["PE"],
  "56": ["CL"],

  // Europe
  "44": ["GB", "UK"],
  "49": ["DE"],
  "33": ["FR"],
  "34": ["ES"],
  "39": ["IT"],
  "31": ["NL"],
  "48": ["PL"],
  "353": ["IE"],
  "351": ["PT"],
  "46": ["SE"],
  "47": ["NO"],
  "358": ["FI"],
  "45": ["DK"],
  "32": ["BE"],
  "41": ["CH"],
  "43": ["AT"],
  "30": ["GR"],
  "420": ["CZ"],
  "36": ["HU"],
  "40": ["RO"],

  // Africa
  "254": ["KE"],
  "234": ["NG"],
  "27": ["ZA"],
  "20": ["EG"],
  "233": ["GH"],
  "255": ["TZ"],
  "256": ["UG"],
  "251": ["ET"],
  "212": ["MA"],
  "213": ["DZ"],
  "221": ["SN"],
  "225": ["CI"],
  "250": ["RW"],

  // Asia
  "91": ["IN"],
  "86": ["CN"],
  "81": ["JP"],
  "82": ["KR"],
  "66": ["TH"],
  "84": ["VN"],
  "62": ["ID"],
  "63": ["PH"],
  "65": ["SG"],
  "60": ["MY"],
  "92": ["PK"],
  "880": ["BD"],
  "971": ["AE"],
  "966": ["SA"],
  "972": ["IL"],
  "90": ["TR"],

  // Oceania
  "61": ["AU"],
  "64": ["NZ"],
};

// Sorted longest-first so "1" doesn't beat "1000" etc. (none currently
// overlap that way but cheap insurance + future-proof).
const SORTED_PREFIXES = Object.keys(DIALING_CODES).sort((a, b) => b.length - a.length);

/**
 * Strip everything that isn't a digit. Drops the leading + automatically.
 */
function digits(s: string): string {
  return s.replace(/\D+/g, "");
}

/**
 * Resolve a phone number to its candidate country codes by longest-prefix
 * match. Returns null when the leading digits don't match any known code.
 */
export function phoneCountryCandidates(phone: string | null | undefined): string[] | null {
  if (!phone) return null;
  const d = digits(phone);
  if (!d) return null;
  for (const prefix of SORTED_PREFIXES) {
    if (d.startsWith(prefix)) return DIALING_CODES[prefix];
  }
  return null;
}

/**
 * Returns true when the user's claimed phone country is consistent with
 * their detected IP country. Used to stamp users.country_verified_at when
 * tier-2 verification succeeds.
 */
export function phoneMatchesCountry(phone: string | null | undefined, countryIso: string | null | undefined): boolean {
  if (!phone || !countryIso) return false;
  const candidates = phoneCountryCandidates(phone);
  if (!candidates) return false;
  return candidates.includes(countryIso.toUpperCase());
}
