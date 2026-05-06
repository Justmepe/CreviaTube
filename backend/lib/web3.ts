import { createPublicClient, createWalletClient, http, parseAbiItem, getAddress, encodeFunctionData, erc20Abi, type Address, type PublicClient, type WalletClient, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia } from "viem/chains";

const CHAIN_ID = Number(process.env.WEB3_CHAIN_ID || 84532);
const RPC_URL = process.env.ALCHEMY_BASE_RPC_URL || "https://sepolia.base.org";

const chain = CHAIN_ID === 8453 ? base : baseSepolia;

export const publicClient: PublicClient = createPublicClient({
  chain,
  transport: http(RPC_URL),
});

export const USDC_ADDRESS = (process.env.USDC_CONTRACT_ADDRESS ||
  "0x036CbD53842c5426634e7929541eC2318f3dCF7e") as Address; // Base Sepolia default

export const RECEIVE_ADDRESS = (process.env.PAYMENT_RECEIVE_WALLET || "") as Address;

export const USDC_DECIMALS = 6;

// USDC.transfer(address,uint256) emits an ERC-20 Transfer event:
//   Transfer(address indexed from, address indexed to, uint256 value)
export const TRANSFER_EVENT = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);

export function toUsdcUnits(amountStr: string): bigint {
  // amountStr is decimal-formatted, e.g. "5.00" → 5_000_000n (6 decimals)
  const [whole, frac = ""] = amountStr.split(".");
  const fracPadded = (frac + "000000").slice(0, USDC_DECIMALS);
  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(fracPadded || "0");
}

export function isSameAddress(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  try {
    return getAddress(a) === getAddress(b);
  } catch {
    return false;
  }
}

// --- Outbound payout signer (Phase 2e) ---
// Loaded lazily so the server boots even when PAYOUT_PRIVATE_KEY is unset.
let _payoutWallet: WalletClient | undefined;
let _payoutAccount: ReturnType<typeof privateKeyToAccount> | undefined;

function getPayoutWallet(): { wallet: WalletClient; account: ReturnType<typeof privateKeyToAccount> } | null {
  const key = process.env.PAYOUT_PRIVATE_KEY?.trim();
  if (!key) return null;
  if (!_payoutWallet) {
    const pk: Hex = key.startsWith("0x") ? (key as Hex) : (`0x${key}` as Hex);
    _payoutAccount = privateKeyToAccount(pk);
    _payoutWallet = createWalletClient({ account: _payoutAccount, chain, transport: http(RPC_URL) });
  }
  return { wallet: _payoutWallet, account: _payoutAccount! };
}

export function payoutWalletAddress(): Address | null {
  const w = getPayoutWallet();
  return w?.account.address ?? null;
}

export type SendResult =
  | { ok: true; txHash: Hex }
  | { ok: false; reason: string };

export async function sendUsdcPayout(opts: { to: Address; amountUnits: bigint }): Promise<SendResult> {
  const w = getPayoutWallet();
  if (!w) return { ok: false, reason: "PAYOUT_PRIVATE_KEY not configured" };
  try {
    const txHash = await w.wallet.writeContract({
      account: w.account,
      chain,
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "transfer",
      args: [opts.to, opts.amountUnits],
    });
    return { ok: true, txHash };
  } catch (e: any) {
    return { ok: false, reason: e?.shortMessage || e?.message || "Transfer failed" };
  }
}

export type VerifyResult =
  | { ok: true; from: Address; to: Address; value: bigint }
  | { ok: false; reason: string };

export async function verifyUsdcTransfer(opts: {
  txHash: `0x${string}`;
  expectedTo: Address;
  expectedFrom?: Address;
  minValue: bigint;
}): Promise<VerifyResult> {
  // Test hook: e2e suite sets WEB3_MOCK_VERIFY=true so we don't have to
  // execute a real on-chain transfer to exercise the funding/payment flow.
  // Returns a deterministic ok response with the expected receiver and the
  // exact minValue. NEVER set this in production.
  if (process.env.WEB3_MOCK_VERIFY === "true") {
    const from = (opts.expectedFrom || "0x000000000000000000000000000000000000dEaD") as Address;
    return { ok: true, from, to: opts.expectedTo, value: opts.minValue };
  }

  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: opts.txHash });
  } catch (e: any) {
    return { ok: false, reason: `Receipt fetch failed: ${e?.shortMessage || e?.message || "unknown"}` };
  }
  if (!receipt) return { ok: false, reason: "Transaction not found yet (still pending)" };
  if (receipt.status !== "success") return { ok: false, reason: "Transaction reverted" };

  // Find the USDC Transfer log to expectedTo with value >= minValue
  for (const log of receipt.logs) {
    if (!isSameAddress(log.address, USDC_ADDRESS)) continue;
    if (log.topics.length < 3) continue;
    // topic[0] = event signature, topic[1] = from, topic[2] = to
    const fromTopic = log.topics[1] as `0x${string}`;
    const toTopic = log.topics[2] as `0x${string}`;
    const from = getAddress("0x" + fromTopic.slice(26)) as Address;
    const to = getAddress("0x" + toTopic.slice(26)) as Address;
    if (!isSameAddress(to, opts.expectedTo)) continue;
    if (opts.expectedFrom && !isSameAddress(from, opts.expectedFrom)) continue;
    const value = BigInt(log.data);
    if (value < opts.minValue) continue;
    return { ok: true, from, to, value };
  }
  return { ok: false, reason: "No matching USDC Transfer log on this transaction" };
}
