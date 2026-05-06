import { describe, it, expect } from "vitest";
import { resolvePersona, isCampaigner } from "../../client/src/features/personas/resolver";
import type { ResolvableUser } from "../../client/src/features/personas/types";

describe("resolvePersona", () => {
  it("returns 'admin' for admin role", () => {
    expect(resolvePersona({ role: "admin" })).toBe("admin");
  });

  it("returns 'clipper' for clipper role regardless of accountType", () => {
    expect(resolvePersona({ role: "clipper", accountType: "influencer" })).toBe("clipper");
    expect(resolvePersona({ role: "clipper", accountType: "business" })).toBe("clipper");
    expect(resolvePersona({ role: "clipper" })).toBe("clipper");
  });

  it("returns 'founder' when stage is founder_prelaunch", () => {
    expect(
      resolvePersona({ role: "creator", accountType: "business", campaignerStage: "founder_prelaunch" })
    ).toBe("founder");
  });

  it("returns 'influencer' when stage is solo_creator (graduation track)", () => {
    expect(
      resolvePersona({ role: "creator", accountType: "business", campaignerStage: "solo_creator" })
    ).toBe("influencer");
  });

  it("returns 'influencer' when accountType is influencer (legacy users without stage)", () => {
    expect(resolvePersona({ role: "creator", accountType: "influencer" })).toBe("influencer");
  });

  it("returns 'brand' for established_brand and early_brand stages", () => {
    expect(
      resolvePersona({ role: "creator", accountType: "business", campaignerStage: "established_brand" })
    ).toBe("brand");
    expect(
      resolvePersona({ role: "creator", accountType: "business", campaignerStage: "early_brand" })
    ).toBe("brand");
  });

  it("returns 'brand' when accountType is business and no stage set", () => {
    expect(resolvePersona({ role: "creator", accountType: "business" })).toBe("brand");
  });

  it("returns 'brand' as a safe fallback when accountType is missing", () => {
    expect(resolvePersona({ role: "creator" })).toBe("brand");
  });

  it("returns 'brand' for null/undefined input (defensive)", () => {
    expect(resolvePersona(null)).toBe("brand");
    expect(resolvePersona(undefined)).toBe("brand");
  });

  it("stage takes precedence over accountType when both set", () => {
    // A user with accountType=influencer who self-identified as a founder
    // should be treated as a founder.
    const u: ResolvableUser = {
      role: "creator",
      accountType: "influencer",
      campaignerStage: "founder_prelaunch",
    };
    expect(resolvePersona(u)).toBe("founder");
  });
});

describe("isCampaigner", () => {
  it("identifies the three campaigner personas", () => {
    expect(isCampaigner("brand")).toBe(true);
    expect(isCampaigner("influencer")).toBe(true);
    expect(isCampaigner("founder")).toBe(true);
  });

  it("rejects worker and ops personas", () => {
    expect(isCampaigner("clipper")).toBe(false);
    expect(isCampaigner("admin")).toBe(false);
  });
});
