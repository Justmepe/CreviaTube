// Persona types for the platform. Five personas total:
// - 3 campaigner personas (people who fund campaigns), differentiated by
//   how they grow and what they're optimizing for.
// - 1 worker persona (clippers — same flow regardless of who funded the
//   campaign).
// - 1 ops persona (admin).
//
// At the schema level we have:
//   - users.role:           "creator" | "clipper" | "admin"
//   - users.accountType:    "influencer" | "business" | null
//   - users.campaignerStage: "established_brand" | "early_brand" |
//                           "solo_creator" | "founder_prelaunch" | null
//
// Persona is derived from those three fields via resolvePersona(), so
// the schema stays simple and personas are an interpretive layer.

export type Persona =
  | "brand"
  | "influencer"
  | "founder"
  | "clipper"
  | "admin";

// Stage is mutable. A user starts as one and may graduate over time.
// Today graduation is manual (settings page); auto-promotion on milestone
// hit is on the follow-up list.
export type CampaignerStage =
  | "established_brand"
  | "early_brand"
  | "solo_creator"
  | "founder_prelaunch";

// Lifecycle ordering within the campaigner side. Useful for "graduate to
// the next stage" UX and milestone checks.
export const CAMPAIGNER_STAGE_PROGRESSION: CampaignerStage[] = [
  "founder_prelaunch",
  "early_brand",
  "established_brand",
];
// solo_creator is its own track and doesn't progress along this line.

export type ResolvableUser = {
  role: "creator" | "clipper" | "admin";
  accountType?: "influencer" | "business" | null;
  campaignerStage?: CampaignerStage | null;
};
