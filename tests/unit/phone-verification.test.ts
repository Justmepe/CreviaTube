import { describe, it, expect } from "vitest";
import { phoneCountryCandidates, phoneMatchesCountry } from "../../backend/lib/phone-verification";

describe("phoneCountryCandidates", () => {
  it("returns null for empty / nullish input", () => {
    expect(phoneCountryCandidates(null)).toBeNull();
    expect(phoneCountryCandidates(undefined)).toBeNull();
    expect(phoneCountryCandidates("")).toBeNull();
    expect(phoneCountryCandidates("   ")).toBeNull();
  });

  it("strips non-digits before matching", () => {
    expect(phoneCountryCandidates("+1 (555) 123-4567")).toEqual(["US", "CA"]);
    expect(phoneCountryCandidates("+44 20 7946 0958")).toEqual(["GB", "UK"]);
    expect(phoneCountryCandidates("254 712 345 678")).toEqual(["KE"]);
  });

  it("does longest-prefix matching", () => {
    // 1 vs 254 — 254 should win for KE
    expect(phoneCountryCandidates("+254712345678")).toEqual(["KE"]);
    // 1 vs nothing longer — fall back to NANP
    expect(phoneCountryCandidates("+15551234567")).toEqual(["US", "CA"]);
  });

  it("returns null when no prefix matches", () => {
    expect(phoneCountryCandidates("999999999")).toBeNull(); // bogus prefix
  });

  it("covers a sample of countries from each continent", () => {
    expect(phoneCountryCandidates("+5511987654321")).toEqual(["BR"]); // South America
    expect(phoneCountryCandidates("+33612345678")).toEqual(["FR"]);    // Europe
    expect(phoneCountryCandidates("+234801234567")).toEqual(["NG"]);   // Africa
    expect(phoneCountryCandidates("+919876543210")).toEqual(["IN"]);   // Asia
    expect(phoneCountryCandidates("+61412345678")).toEqual(["AU"]);    // Oceania
  });
});

describe("phoneMatchesCountry", () => {
  it("returns true when phone country code matches IP country", () => {
    expect(phoneMatchesCountry("+254712345678", "KE")).toBe(true);
    expect(phoneMatchesCountry("+15551234567", "US")).toBe(true);
    expect(phoneMatchesCountry("+15551234567", "CA")).toBe(true);  // NANP shares
    expect(phoneMatchesCountry("+33612345678", "FR")).toBe(true);
  });

  it("returns false on mismatch (the verification we actually care about)", () => {
    expect(phoneMatchesCountry("+254712345678", "US")).toBe(false);
    expect(phoneMatchesCountry("+15551234567", "KE")).toBe(false);
    expect(phoneMatchesCountry("+33612345678", "DE")).toBe(false);
  });

  it("returns false when phone is missing or unrecognized", () => {
    expect(phoneMatchesCountry(null, "US")).toBe(false);
    expect(phoneMatchesCountry("", "US")).toBe(false);
    expect(phoneMatchesCountry("999999", "US")).toBe(false);
  });

  it("returns false when IP country is missing (can't verify)", () => {
    expect(phoneMatchesCountry("+15551234567", null)).toBe(false);
    expect(phoneMatchesCountry("+15551234567", "")).toBe(false);
  });

  it("is case-insensitive on the country code", () => {
    expect(phoneMatchesCountry("+254712345678", "ke")).toBe(true);
    expect(phoneMatchesCountry("+15551234567", "us")).toBe(true);
  });
});
