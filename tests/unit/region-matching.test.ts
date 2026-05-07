import { describe, it, expect } from "vitest";
import {
  normalizeCountry,
  clipperMatchesRegions,
  groupByContinent,
  COUNTRY_TO_CONTINENT,
} from "../../backend/lib/region";

describe("normalizeCountry", () => {
  it("uppercases and validates ISO alpha-2", () => {
    expect(normalizeCountry("us")).toBe("US");
    expect(normalizeCountry("ke")).toBe("KE");
    expect(normalizeCountry("US")).toBe("US");
  });

  it("rejects invalid shapes", () => {
    expect(normalizeCountry("USA")).toBeNull();
    expect(normalizeCountry("")).toBeNull();
    expect(normalizeCountry(null)).toBeNull();
    expect(normalizeCountry(undefined)).toBeNull();
    expect(normalizeCountry("12")).toBeNull();
    expect(normalizeCountry("u")).toBeNull();
  });
});

describe("clipperMatchesRegions", () => {
  it("returns true when targetRegions is empty (global campaign)", () => {
    expect(clipperMatchesRegions("US", [])).toBe(true);
    expect(clipperMatchesRegions("US", null)).toBe(true);
    expect(clipperMatchesRegions("US", undefined)).toBe(true);
  });

  it("returns true on direct country match", () => {
    expect(clipperMatchesRegions("KE", ["KE"])).toBe(true);
    expect(clipperMatchesRegions("ke", ["KE"])).toBe(true); // clipper code lowercase still matches
    expect(clipperMatchesRegions("US", ["KE", "US", "GB"])).toBe(true);
  });

  it("returns true on continent match", () => {
    expect(clipperMatchesRegions("KE", ["AF"])).toBe(true);  // KE is AF
    expect(clipperMatchesRegions("FR", ["EU"])).toBe(true);  // FR is EU
    expect(clipperMatchesRegions("BR", ["SA"])).toBe(true);  // BR is SA
  });

  it("rejects out-of-region clippers", () => {
    expect(clipperMatchesRegions("US", ["KE"])).toBe(false);
    expect(clipperMatchesRegions("DE", ["AF"])).toBe(false);
  });

  it("rejects clippers with no country (can't verify region targeting)", () => {
    expect(clipperMatchesRegions(null, ["US"])).toBe(false);
    expect(clipperMatchesRegions("", ["US"])).toBe(false);
  });

  it("mixes country and continent codes in the same target list", () => {
    // Targeting Europe broadly + India specifically
    const targets = ["EU", "IN"];
    expect(clipperMatchesRegions("DE", targets)).toBe(true);  // EU continent match
    expect(clipperMatchesRegions("IN", targets)).toBe(true);  // direct country match
    expect(clipperMatchesRegions("US", targets)).toBe(false); // neither
  });
});

describe("groupByContinent", () => {
  it("counts clippers per continent", () => {
    const grouped = groupByContinent(["US", "KE", "NG", "DE", "FR", "BR"]);
    expect(grouped.NA).toBe(1);   // US
    expect(grouped.AF).toBe(2);   // KE, NG
    expect(grouped.EU).toBe(2);   // DE, FR
    expect(grouped.SA).toBe(1);   // BR
  });

  it("buckets unknown / null countries under 'unknown'", () => {
    const grouped = groupByContinent(["US", null, undefined, "ZZ"]); // ZZ not in map
    expect(grouped.NA).toBe(1);
    expect(grouped.unknown).toBe(3);
  });
});

describe("COUNTRY_TO_CONTINENT coverage", () => {
  it("covers all the COUNTRIES the campaign-creation form exposes", () => {
    // Form COUNTRIES list (lowercased in the form, normalized here).
    const formCountries = ["US", "GB", "CA", "AU", "DE", "FR", "KE", "NG", "ZA", "IN"];
    for (const c of formCountries) {
      expect(COUNTRY_TO_CONTINENT[c], `missing continent for ${c}`).toBeTruthy();
    }
  });
});
