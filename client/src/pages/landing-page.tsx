import { useAuth } from "@/features/auth/hooks/use-auth";
import { useLocation } from "wouter";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Sparkles,
  BarChart3,
  Star,
  Building2,
  Zap,
  PlayCircle,
  Plus,
} from "lucide-react";

// Lucide ships the old Twitter bird; X rebranded to a different mark.
const XLogo = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Mock data for the live activity sections. These are placeholders for launch;
// once real campaigns + payouts exist, swap to API queries.
const recentPayouts = [
  { amount: "450.00", clipper: "@maya.clips",   campaign: "Fitness app launch", txShort: "0x7c2…3e91", txUrl: "https://basescan.org" },
  { amount: "120.00", clipper: "@vish_xo",      campaign: "Crypto wallet promo", txShort: "0x4a1…2b88", txUrl: "https://basescan.org" },
  { amount: "310.50", clipper: "@dani.shorts",  campaign: "Beauty drop", txShort: "0x9d3…f102", txUrl: "https://basescan.org" },
  { amount: "89.20",  clipper: "@indiegamer",   campaign: "Wishlist push", txShort: "0xc01…8e44", txUrl: "https://basescan.org" },
  { amount: "240.00", clipper: "@boltcaster",   campaign: "$ZAP mint", txShort: "0x55e…1d27", txUrl: "https://basescan.org" },
  { amount: "75.00",  clipper: "@reels.ria",    campaign: "Coach course", txShort: "0x3f7…9aa3", txUrl: "https://basescan.org" },
];

type LiveCampaign = {
  name: string;
  bounty: string;
  bountyUnit: string;
  percentFilled: number;
  platforms: string[];
  status: "open" | "filling";
  daysLeft: number;
};

const liveCampaigns: LiveCampaign[] = [
  { name: "Beauty brand launch · Drop the App", bounty: "0.04", bountyUnit: "1k views", percentFilled: 62, platforms: ["TikTok", "Reels"],   status: "filling", daysLeft: 4 },
  { name: "$ZAP token mint",                    bounty: "0.10", bountyUnit: "click",    percentFilled: 28, platforms: ["X", "YouTube"],     status: "open",    daysLeft: 12 },
  { name: "Fitness coach 8-week course",        bounty: "2.50", bountyUnit: "signup",   percentFilled: 45, platforms: ["IG", "TikTok"],     status: "open",    daysLeft: 9 },
  { name: "Indie game wishlist push",           bounty: "0.06", bountyUnit: "1k views", percentFilled: 71, platforms: ["YouTube", "TikTok"], status: "filling", daysLeft: 3 },
];

export default function LandingPage() {
  const [, setLocation] = useLocation();

  let user = null;
  try {
    user = useAuth().user;
  } catch {
    // AuthProvider may not wrap the public marketing route
  }

  if (user) {
    setLocation("/");
    return null;
  }

  const goToAuth = () => setLocation("/auth");
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-slate-50 text-slate-900 antialiased font-sans">
      <style>{`
        .brand-grad { background-image: linear-gradient(135deg, #1D4ED8 0%, #047857 100%); }
        .brand-grad-text { background-image: linear-gradient(135deg, #1D4ED8 0%, #047857 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .grid-bg {
          background-image:
            linear-gradient(to right, rgba(29,78,216,0.06) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(29,78,216,0.06) 1px, transparent 1px);
          background-size: 56px 56px;
        }
        .glow { position: absolute; inset: auto; pointer-events: none; filter: blur(80px); opacity: 0.45; }
        .ticker-track { animation: ticker 50s linear infinite; }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>

      {/* ============ NAV ============ */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-2.5">
            <div className="w-9 h-9 brand-grad rounded-xl flex items-center justify-center shadow-sm">
              <PlayCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold brand-grad-text">CreviaTube</span>
          </button>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <button onClick={() => scrollTo("how")} className="hover:text-slate-900">How it works</button>
            <button onClick={() => scrollTo("why")} className="hover:text-slate-900">Why USDC</button>
            <button onClick={() => scrollTo("fees")} className="hover:text-slate-900">Fees</button>
            <button onClick={() => scrollTo("faq")} className="hover:text-slate-900">FAQ</button>
          </nav>
          <div className="flex items-center gap-3">
            <a href="https://x.com/creviatube" target="_blank" rel="noopener noreferrer" aria-label="CreviaTube on X" className="hidden sm:flex w-8 h-8 items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition">
              <XLogo className="w-4 h-4" />
            </a>
            <button onClick={goToAuth} className="text-sm font-medium text-slate-700 hover:text-slate-900">Log in</button>
            <button onClick={goToAuth} className="brand-grad text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition">
              Get started
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="glow w-[500px] h-[500px] rounded-full brand-grad -top-40 -right-40" />
        <div className="glow w-[400px] h-[400px] rounded-full bg-emerald-400 top-40 -left-32 opacity-30" />

        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-600 mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Now live on Base. On-chain USDC payouts.
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Pay for <span className="brand-grad-text">verified results</span>, not promises.
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mt-6 max-w-2xl mx-auto">
            <strong className="text-slate-900">Brands</strong> launching a product. <strong className="text-slate-900">Creators</strong> growing an audience. <strong className="text-slate-900">Founders</strong> chasing distribution. Fund a campaign in USDC, clippers post, and rewards release when goals are hit.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9">
            <button onClick={goToAuth} className="brand-grad text-white text-base font-semibold px-7 py-4 rounded-xl shadow-lg hover:shadow-xl transition inline-flex items-center gap-2">
              Start a campaign
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button onClick={goToAuth} className="bg-white text-slate-900 text-base font-semibold px-7 py-4 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition inline-flex items-center gap-2">
              Earn as a clipper
            </button>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-slate-500">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Funds held in on-chain escrow</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> AI content review before payout</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Anti-bot view verification</div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative max-w-5xl mx-auto px-6 -mt-2 pb-16">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-200">
            {[
              { v: "100%", l: "On-chain payouts" },
              { v: "~$0.01", l: "Avg gas on Base" },
              { v: "< 5 min", l: "From verify to wallet" },
              { v: "20%", l: "Flat platform fee" },
            ].map((s) => (
              <div key={s.l} className="p-6 text-center">
                <div className="text-3xl font-bold text-slate-900">{s.v}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ LIVE PAYOUTS TICKER ============ */}
      <section className="bg-white border-y border-slate-200 overflow-hidden">
        <div className="py-3 flex items-center">
          <div className="flex items-center gap-2 px-5 shrink-0 border-r border-slate-200 self-stretch">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider whitespace-nowrap">Live payouts</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-10 ticker-track whitespace-nowrap pl-10">
              {[...recentPayouts, ...recentPayouts].map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-sm shrink-0">
                  <span className="font-bold text-emerald-700">+{p.amount} USDC</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-medium">{p.clipper}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-slate-500">{p.campaign}</span>
                  <a href={p.txUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-blue-600 hover:underline">{p.txShort} ↗</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ RUNNING NOW (live campaigns) ============ */}
      <section className="py-20 bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="text-sm font-semibold brand-grad-text uppercase tracking-wider">Running now</p>
              <h2 className="text-4xl md:text-5xl font-bold mt-2">Open bounties.<br className="md:hidden" /> Real campaigns.</h2>
            </div>
            <button onClick={goToAuth} className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">
              See all open campaigns <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {liveCampaigns.map((c) => (
              <CampaignCard key={c.name} {...c} onApply={goToAuth} />
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHO IT'S FOR ============ */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold brand-grad-text uppercase tracking-wider">Who it's for</p>
            <h2 className="text-4xl md:text-5xl font-bold mt-3">Built for whoever needs reach.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <PersonaCard tint="blue" Icon={Building2} title="Brands & businesses" desc="Launching a product or scaling a brand. Skip agency markups. Pay for verified reach, not impressions on a slide deck." />
            <PersonaCard tint="emerald" Icon={Sparkles} title="Creators" desc="Got a course, merch line, or paid community? Spin up a clipping campaign and let other creators distribute it." />
            <PersonaCard tint="indigo" Icon={Zap} title="Founders & entrepreneurs" desc="Pre-seed to growth stage. Treat clippers as a performance-marketing channel. Pay only when you hit the goal." />
            <PersonaCard tint="amber" Icon={PlayCircle} title="Clippers" desc="You make the content. Browse open campaigns, post your clip, get paid in USDC the moment metrics verify." />
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold brand-grad-text uppercase tracking-wider">How it works</p>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 max-w-3xl mx-auto">Two sides of the same campaign</h2>
            <p className="text-slate-600 mt-4 max-w-2xl mx-auto">Creators bring the budget. Clippers bring the audience. The smart contract handles the rest.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Run a campaign (blue) */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">Run a campaign</h3>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-6">
                {["Brands", "Creators", "Founders & entrepreneurs"].map((t) => (
                  <span key={t} className="text-xs font-medium px-2.5 py-1 bg-white border border-blue-200 text-blue-700 rounded-full">{t}</span>
                ))}
              </div>
              <ol className="space-y-5">
                <Step n={1} tint="blue" title="Set a goal & budget" body="100k verified views, 5k clicks, signups. Pick what you want, set the bounty." />
                <Step n={2} tint="blue" title="Fund in USDC on Base" body="One on-chain transaction. Funds sit in escrow until clippers earn them." />
                <Step n={3} tint="blue" title="Review, then ship" body="AI flags low-quality work; you approve the rest. Reach the goal, payouts auto-fire." />
              </ol>
              <button onClick={goToAuth} className="mt-7 inline-flex items-center gap-2 text-blue-700 font-semibold text-sm hover:gap-3 transition-all">
                Start a campaign <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Earn as a clipper (emerald) */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <PlayCircle className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold">Earn as a clipper</h3>
              </div>
              <ol className="space-y-5">
                <Step n={1} tint="emerald" title="Browse open campaigns" body="Filtered to your platforms (TikTok, YouTube Shorts, IG Reels) and audience fit." />
                <Step n={2} tint="emerald" title="Post your clip" body="Drop the link. Our tracker measures verified views, clicks, and conversions automatically." />
                <Step n={3} tint="emerald" title="Get paid in USDC" body="Hit the goal, get paid to your wallet. No invoices, no Net-30, no DM follow-ups." />
              </ol>
              <button onClick={goToAuth} className="mt-7 inline-flex items-center gap-2 text-emerald-700 font-semibold text-sm hover:gap-3 transition-all">
                Earn as a clipper <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY USDC ============ */}
      <section id="why" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-sm font-semibold brand-grad-text uppercase tracking-wider">Why USDC on Base</p>
              <h2 className="text-4xl md:text-5xl font-bold mt-3 leading-tight">Goal hits.<br />Wallet pings.</h2>
              <p className="text-slate-600 mt-5 text-lg">
                The second your metrics cross the line, USDC moves. No 30-day wires. No "the finance team is on holiday." No swap fees eating into the bounty. Just dollar-pegged stablecoins on a chain where transactions cost pennies.
              </p>
              <ul className="mt-8 space-y-4">
                <Bullet title="Pegged to USD" body="Clippers don't take volatility risk. 1 USDC = $1 today, next week, always." />
                <Bullet title="Pennies in gas" body="Base L2 keeps fees low enough that micro-payouts actually work." />
                <Bullet title="Public ledger" body="Every campaign-fund and every payout has a Basescan link. Disputes are short." />
              </ul>
            </div>

            {/* Mock receipt card */}
            <div className="relative">
              <div className="absolute inset-0 brand-grad rounded-3xl blur-2xl opacity-20" />
              <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl p-7 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" strokeWidth={3} />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Payout settled</div>
                      <div className="text-xs text-slate-500">2 minutes ago</div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">On-chain</span>
                </div>
                <div className="border-t border-slate-100 pt-5 space-y-3 text-sm">
                  <ReceiptRow label="Campaign" value="Fitness app launch · TikTok" />
                  <ReceiptRow label="Clipper" value="@maya.clips" />
                  <ReceiptRow label="Verified views" value="142,330 / 100,000" />
                  <ReceiptRow label="Tx hash" value={<span className="font-mono text-xs text-blue-600">0x7c2…3e91 ↗</span>} />
                </div>
                <div className="border-t border-slate-100 pt-5 flex items-end justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Released to wallet</div>
                    <div className="text-3xl font-bold">450.00 <span className="text-base text-slate-500">USDC</span></div>
                  </div>
                  <div className="brand-grad text-white text-xs font-semibold px-3 py-1.5 rounded-full">Auto-paid</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TRUST GRID ============ */}
      <section className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold brand-grad-text uppercase tracking-wider">Built for trust</p>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 max-w-3xl mx-auto">Both sides win or no one pays.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <TrustCard tint="blue" Icon={Shield} title="Escrow on day one" body="Campaign budget is locked the moment you fund. Clippers see the money before they post." />
            <TrustCard tint="emerald" Icon={Sparkles} title="AI content review" body="Every submission gets a quality score before it counts toward the goal. Low effort doesn't pay." />
            <TrustCard tint="indigo" Icon={BarChart3} title="Real-view tracking" body="Bot detection on every event. Inflated numbers get filtered out before payouts." />
            <TrustCard tint="amber" Icon={Star} title="Reputation, on-chain" body="Clipper ratings stick to the wallet, not the username. No more disposable accounts." />
          </div>
        </div>
      </section>

      {/* ============ FEES ============ */}
      <section id="fees" className="py-24 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold brand-grad-text uppercase tracking-wider">Fees</p>
          <h2 className="text-4xl md:text-5xl font-bold mt-3">One number. No surprises.</h2>
          <p className="text-slate-600 mt-4 max-w-xl mx-auto">CreviaTube takes a flat 20% of the campaign budget. That's it. No subscription, no hidden cuts on payouts, no swap spreads.</p>

          <div className="mt-12 bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-left">
            <div className="text-sm font-semibold text-slate-500 mb-4">Example: $10,000 campaign</div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Creator funds</span>
                <span className="font-bold text-lg">10,000.00 USDC</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Platform fee (20%)</span>
                <span className="font-medium text-slate-500">- 2,000.00 USDC</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="font-semibold">Available to clippers</span>
                <span className="font-bold text-2xl brand-grad-text">8,000.00 USDC</span>
              </div>
            </div>
            <div className="mt-5 text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-3">No fee on top of clipper payouts. The clipper receives exactly what the campaign rules say they earn.</div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-24 bg-white border-y border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold brand-grad-text uppercase tracking-wider">FAQ</p>
            <h2 className="text-4xl md:text-5xl font-bold mt-3">Common questions</h2>
          </div>
          <div className="space-y-3">
            <FaqItem q="Do I need to know crypto to use this?" a="If you can use Stripe or PayPal, you'll be fine. We use Reown AppKit for wallet connection, which works with MetaMask, Coinbase Wallet, or you can sign in with email and we'll create a wallet for you." />
            <FaqItem q="What happens to unused budget?" a="If a campaign ends without hitting its goal, the unspent escrow returns to your wallet automatically. The smart contract enforces it." />
            <FaqItem q="Which platforms do you track?" a="TikTok, YouTube Shorts, Instagram Reels, X, and Twitch. All verified through their official APIs plus our anti-bot layer." />
            <FaqItem q="When do clippers get paid?" a="Once verified metrics cross the campaign goal, the contract releases the bounty. Most clippers see USDC in their wallet within minutes of approval." />
            <FaqItem q="Is this legal where I am?" a="USDC payouts to a self-custodied wallet are available in 100+ countries. We don't currently serve OFAC-sanctioned regions. Check our Terms for the full list." />
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 brand-grad" />
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold leading-tight">Pay for results.<br />Earn from results.</h2>
          <p className="text-white/80 mt-5 text-lg max-w-xl mx-auto">No invoices. No promises. Just on-chain receipts and content that performs.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
            <button onClick={goToAuth} className="bg-white text-slate-900 font-semibold px-7 py-4 rounded-xl shadow-lg hover:bg-slate-100 transition">Start a campaign</button>
            <button onClick={goToAuth} className="bg-white/10 backdrop-blur text-white font-semibold px-7 py-4 rounded-xl border border-white/30 hover:bg-white/20 transition">Earn as a clipper</button>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-slate-950 text-slate-400 py-14">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 brand-grad rounded-xl flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-bold text-white">CreviaTube</span>
            </div>
            <p className="text-sm max-w-sm">The clipper-rewards marketplace where creators pay for verified results in USDC, on-chain.</p>
            <div className="flex items-center gap-3 mt-5">
              <a href="https://x.com/creviatube" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-900 hover:bg-slate-800 transition text-white">
                <XLogo className="w-4 h-4" />
              </a>
            </div>
          </div>
          <FooterCol title="Product" items={[
            { label: "For creators", onClick: goToAuth },
            { label: "For clippers", onClick: goToAuth },
            { label: "How it works", onClick: () => scrollTo("how") },
            { label: "Fees", onClick: () => scrollTo("fees") },
          ]} />
          <FooterCol title="Legal" items={[
            { label: "Terms of service", onClick: () => setLocation("/terms") },
            { label: "Privacy policy", onClick: () => setLocation("/privacy") },
            { label: "Cookie policy", onClick: () => setLocation("/cookies") },
            { label: "Contact", onClick: () => setLocation("/contact") },
          ]} />
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <div>© {new Date().getFullYear()} CreviaTube. All rights reserved.</div>
          <div>Built on Base · Powered by USDC</div>
        </div>
      </footer>
    </div>
  );
}

// ============ Subcomponents ============

type Tint = "blue" | "emerald" | "indigo" | "amber";

const tintMap: Record<Tint, { bg: string; text: string; pillBg: string; border: string; cardBg: string }> = {
  blue:    { bg: "bg-blue-600",    text: "text-blue-700",    pillBg: "bg-blue-100",    border: "border-blue-100",    cardBg: "from-blue-50 to-blue-100/40" },
  emerald: { bg: "bg-emerald-600", text: "text-emerald-700", pillBg: "bg-emerald-100", border: "border-emerald-100", cardBg: "from-emerald-50 to-emerald-100/40" },
  indigo:  { bg: "bg-indigo-600",  text: "text-indigo-700",  pillBg: "bg-indigo-100",  border: "border-indigo-100",  cardBg: "from-indigo-50 to-indigo-100/40" },
  amber:   { bg: "bg-amber-600",   text: "text-amber-700",   pillBg: "bg-amber-100",   border: "border-amber-100",   cardBg: "from-amber-50 to-amber-100/40" },
};

function PersonaCard({ tint, Icon, title, desc }: { tint: Tint; Icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  const t = tintMap[tint];
  return (
    <div className={`bg-gradient-to-br ${t.cardBg} border ${t.border} rounded-2xl p-7`}>
      <div className={`w-11 h-11 rounded-xl ${t.bg} text-white flex items-center justify-center mb-4`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-bold text-lg mb-1">{title}</div>
      <div className="text-sm text-slate-600">{desc}</div>
    </div>
  );
}

function TrustCard({ tint, Icon, title, body }: { tint: Tint; Icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  const t = tintMap[tint];
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 hover:shadow-md transition">
      <div className={`w-10 h-10 rounded-lg ${t.pillBg} ${t.text} flex items-center justify-center mb-4`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-semibold mb-1">{title}</div>
      <div className="text-sm text-slate-600">{body}</div>
    </div>
  );
}

function Step({ n, tint, title, body }: { n: number; tint: "blue" | "emerald"; title: string; body: string }) {
  const ringText = tint === "blue" ? "border-blue-600 text-blue-600" : "border-emerald-600 text-emerald-700";
  return (
    <li className="flex gap-4">
      <span className={`w-7 h-7 shrink-0 rounded-full bg-white border-2 ${ringText} font-bold text-sm flex items-center justify-center`}>{n}</span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-slate-600">{body}</div>
      </div>
    </li>
  );
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <li className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
        <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-slate-600">{body}</div>
      </div>
    </li>
  );
}

function ReceiptRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group bg-slate-50 border border-slate-200 rounded-xl p-5 open:bg-white open:border-blue-200">
      <summary className="flex justify-between items-center cursor-pointer font-semibold list-none">
        {q}
        <Plus className="w-5 h-5 text-slate-400 group-open:rotate-45 transition-transform" />
      </summary>
      <p className="mt-3 text-slate-600 text-sm">{a}</p>
    </details>
  );
}

function CampaignCard({ name, bounty, bountyUnit, percentFilled, platforms, status, daysLeft, onApply }: LiveCampaign & { onApply: () => void }) {
  const open = status === "open";
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col hover:shadow-md hover:-translate-y-0.5 transition">
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${open ? "text-emerald-700" : "text-amber-700"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {open ? "Open" : "Filling"}
        </span>
        <span className="text-xs text-slate-500">{daysLeft}d left</span>
      </div>
      <div className="font-semibold text-base mb-3 line-clamp-2 min-h-[2.75rem]">{name}</div>
      <div className="flex flex-wrap gap-1 mb-4">
        {platforms.map((p) => (
          <span key={p} className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{p}</span>
        ))}
      </div>
      <div className="text-3xl font-bold leading-none">${bounty}<span className="text-sm font-normal text-slate-500"> / {bountyUnit}</span></div>
      <div className="mt-auto pt-5">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div className="h-full brand-grad" style={{ width: `${percentFilled}%` }} />
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">{percentFilled}% filled</span>
          <button onClick={onApply} className="font-semibold text-blue-700 hover:text-blue-800 inline-flex items-center gap-1">
            Apply <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: { label: string; onClick: () => void }[] }) {
  return (
    <div>
      <div className="text-sm font-semibold text-white mb-3">{title}</div>
      <ul className="space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.label}>
            <button onClick={i.onClick} className="hover:text-white text-left">{i.label}</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
