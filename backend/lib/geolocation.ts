// Lightweight server-side geolocation. v1 detection strategy:
//
//   1. Cloudflare-IPCountry header (set by CF when proxied — accurate, free)
//   2. X-Country-Code header (other CDNs / reverse proxies)
//   3. Caller-supplied countryIso in payload (self-attestation fallback)
//
// We deliberately don't ship a maxmind / ip-api dependency in v1. When the
// app is behind Cloudflare (production), the CF header is the cheapest and
// most accurate source. For local dev the value is null and the user can
// self-attest via a Settings field later.
//
// Phase 3.5 may add a real IP→country lookup library if we run outside CF.

import type { Request } from "express";

const ALPHA2 = /^[A-Z]{2}$/;

export function detectCountryIso(req: Request, fallback?: string | null): string | null {
  const cfCountry = req.header("cf-ipcountry");
  if (cfCountry && ALPHA2.test(cfCountry.toUpperCase())) {
    return cfCountry.toUpperCase();
  }

  const xCountry = req.header("x-country-code");
  if (xCountry && ALPHA2.test(xCountry.toUpperCase())) {
    return xCountry.toUpperCase();
  }

  if (fallback && typeof fallback === "string" && ALPHA2.test(fallback.toUpperCase())) {
    return fallback.toUpperCase();
  }

  return null;
}
