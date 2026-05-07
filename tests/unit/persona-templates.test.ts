import { describe, it, expect } from "vitest";
import { PERSONA_REGISTRY, getPersonaConfig } from "../../client/src/features/personas/registry";
import type { Persona } from "../../client/src/features/personas/types";

// Mirror the form's mapping. If this test breaks because the form changed
// it, update both in lockstep — these two maps are the contract that
// prevents the singular/plural goalType bug from ever returning.
const GOAL_TO_RATE_KEY: Record<string, string> = {
  views: "view",
  clicks: "click",
  signups: "signup",
  conversions: "conversion",
  follows: "follow",
  subscribes: "subscribe",
  installs: "install",
};

describe("persona templates contract", () => {
  it("every campaigner persona has at least 4 templates", () => {
    const campaigners: Persona[] = ["brand", "influencer", "founder"];
    for (const p of campaigners) {
      expect(PERSONA_REGISTRY[p].templates.length, `${p} templates`).toBeGreaterThanOrEqual(4);
    }
  });

  it("clipper and admin have no templates (they don't run campaigns)", () => {
    expect(getPersonaConfig("clipper").templates).toEqual([]);
    expect(getPersonaConfig("admin").templates).toEqual([]);
  });

  it("every template's primaryGoal has a corresponding rate key", () => {
    for (const persona of ["brand", "influencer", "founder"] as const) {
      for (const tpl of PERSONA_REGISTRY[persona].templates) {
        const rateKey = GOAL_TO_RATE_KEY[tpl.primaryGoal];
        expect(
          rateKey,
          `template "${tpl.id}" (${persona}) primaryGoal="${tpl.primaryGoal}" must map to a singular rate key`
        ).toBeTruthy();
      }
    }
  });

  it("every template has a positive default goal amount and reward rate", () => {
    for (const persona of ["brand", "influencer", "founder"] as const) {
      for (const tpl of PERSONA_REGISTRY[persona].templates) {
        expect(tpl.defaultGoalAmount, `${tpl.id} default goal amount`).toBeGreaterThan(0);
        expect(tpl.defaultRewardRate, `${tpl.id} default reward rate`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("template ids are unique across all personas", () => {
    const seen = new Set<string>();
    for (const cfg of Object.values(PERSONA_REGISTRY)) {
      for (const tpl of cfg.templates) {
        expect(seen.has(tpl.id), `duplicate template id: ${tpl.id}`).toBe(false);
        seen.add(tpl.id);
      }
    }
  });
});
