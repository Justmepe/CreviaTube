import type { Express } from "express";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { verifyMessage, isAddress, getAddress } from "viem";
import { db } from "../db";
import { users } from "../../shared/schema.js";
import { emit } from "../lib/metrics";

declare module "express-session" {
  interface SessionData {
    walletNonce?: { nonce: string; address: string; issuedAt: string };
  }
}

const NONCE_TTL_MS = 5 * 60 * 1000;

function buildSignMessage(address: string, nonce: string, issuedAt: string): string {
  return [
    "Sign this message to bind your wallet to CreviaTube.",
    "",
    `Address: ${address}`,
    `Nonce: ${nonce}`,
    `Issued: ${issuedAt}`,
  ].join("\n");
}

export function setupWalletAPI(app: Express): void {
  app.get("/api/wallet/nonce", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const address = String(req.query.address || "").toLowerCase();
    if (!isAddress(address)) {
      return res.status(400).json({ message: "Invalid address" });
    }
    const nonce = randomBytes(16).toString("hex");
    const issuedAt = new Date().toISOString();
    req.session.walletNonce = { nonce, address, issuedAt };
    res.json({ nonce, issuedAt, message: buildSignMessage(address, nonce, issuedAt) });
  });

  app.post("/api/wallet/bind", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { address, signature } = req.body as { address?: string; signature?: string };
    if (!address || !signature || !isAddress(address)) {
      return res.status(400).json({ message: "Missing or invalid address/signature" });
    }
    const lowered = address.toLowerCase();
    const stored = req.session.walletNonce;
    if (!stored || stored.address !== lowered) {
      return res.status(400).json({ message: "Nonce not found; request /api/wallet/nonce first" });
    }
    if (Date.now() - new Date(stored.issuedAt).getTime() > NONCE_TTL_MS) {
      delete req.session.walletNonce;
      return res.status(400).json({ message: "Nonce expired; request a new one" });
    }

    const message = buildSignMessage(lowered, stored.nonce, stored.issuedAt);
    let valid = false;
    try {
      valid = await verifyMessage({
        address: getAddress(address),
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      valid = false;
    }
    if (!valid) {
      return res.status(400).json({ message: "Signature does not match address" });
    }

    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.walletAddress, lowered)).limit(1);
    if (existing && existing.id !== req.user.id) {
      return res.status(409).json({ message: "Wallet already bound to another account" });
    }

    await db.update(users).set({ walletAddress: lowered, updatedAt: new Date() }).where(eq(users.id, req.user.id));
    delete req.session.walletNonce;

    emit("wallet_bound", { address: lowered }, req.user.id);

    // Security notification (fire-and-forget). Lazy-imported to avoid hard dep on email at boot.
    void (async () => {
      try {
        const [{ sendEmail, APP_URL: _APP }, React, { WalletBound }] = await Promise.all([
          import("../lib/email"),
          import("react"),
          import("../emails/wallet-bound"),
        ]);
        await sendEmail({
          kind: "wallet_bound",
          to: req.user.email,
          subject: "A wallet was bound to your CreviaTube account",
          react: React.createElement(WalletBound, {
            fullName: req.user.fullName,
            walletAddress: lowered,
            when: new Date().toUTCString(),
          }),
          // Allow re-send if the user re-binds the same wallet later — key on bind timestamp.
          dedupeKey: `wallet_bound:${req.user.id}:${lowered}:${Date.now()}`,
          userId: req.user.id,
        });
      } catch (err) {
        console.error("wallet_bound email failed:", err);
      }
    })();

    res.json({ success: true, walletAddress: lowered });
  });

  app.post("/api/wallet/unbind", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    await db.update(users).set({ walletAddress: null, updatedAt: new Date() }).where(eq(users.id, req.user.id));
    res.json({ success: true });
  });
}
