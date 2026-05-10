import type { Persona, ResolvableUser } from "./types";

/**
 * Single source of truth for "what persona is this user?"
 *
 * Rules in priority order:
 *   1. role=admin             → "admin"
 *   2. role=clipper           → "clipper"
 *   3. role=creator + campaignerStage="founder_prelaunch" → "founder"
 *   4. role=creator + campaignerStage="solo_creator"      → "influencer"
 *   5. role=creator + accountType="founder"               → "founder"
 *   6. role=creator + accountType="influencer"            → "influencer"
 *   7. role=creator + accountType="business"              → "brand"
 *      (covers established_brand and early_brand stages)
 *   8. fallback                → "brand"  (safest default for the campaigner
 *                               flow; legacy users without accountType set
 *                               see the brand experience, which is the most
 *                               feature-rich)
 *
 * Existing users with no campaignerStage still resolve correctly via the
 * accountType fallback. They never see a forced re-onboarding.
 */
export function resolvePersona(user: ResolvableUser | null | undefined): Persona {
  if (!user) return "brand";
  if (user.role === "admin") return "admin";
  if (user.role === "clipper") return "clipper";

  // role === "creator" from here on
  if (user.campaignerStage === "founder_prelaunch") return "founder";
  if (user.campaignerStage === "solo_creator") return "influencer";

  if (user.accountType === "founder") return "founder";
  if (user.accountType === "influencer") return "influencer";
  if (user.accountType === "business") return "brand";

  return "brand";
}

/**
 * Convenience: is this persona a campaigner (someone who funds campaigns)?
 * Used to gate UI like the "Create campaign" button.
 */
export function isCampaigner(persona: Persona): boolean {
  return persona === "brand" || persona === "influencer" || persona === "founder";
}
