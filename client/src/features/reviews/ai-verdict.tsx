import { ShieldCheck, AlertTriangle, ShieldAlert, Brain } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Mirror of backend thresholds in backend/core/services/ai-content-detection.ts.
// If the backend constants move, update these too.
export const AI_AUTOFLAG_THRESHOLD = 0.7;
export const AI_REVIEW_THRESHOLD = 0.4;

export type AiVerdict = "safe" | "review" | "flagged";

export interface AiAnalysis {
  textPatterns: number;
  repetitiveStructure: number;
  vocabularyComplexity: number;
  naturalFlow: number;
  personalTone: number;
}

export interface AiDetectionResult {
  confidence?: number;
  flags?: string[];
  analysis?: AiAnalysis;
  recommendation?: "approve" | "review" | "reject";
}

export function verdictFromConfidence(confidence: number | null | undefined): AiVerdict {
  const c = confidence ?? 0;
  if (c >= AI_AUTOFLAG_THRESHOLD) return "flagged";
  if (c >= AI_REVIEW_THRESHOLD) return "review";
  return "safe";
}

const VERDICT_COPY: Record<AiVerdict, {
  label: string; helper: string; className: string; icon: typeof ShieldCheck;
}> = {
  safe: {
    label: "Looks human-written",
    helper: "Strong personal tone and natural flow. Safe to approve unless other concerns.",
    className: "bg-emerald-50 border-emerald-200 text-emerald-900",
    icon: ShieldCheck,
  },
  review: {
    label: "Mixed signals — needs your judgement",
    helper: "Some AI patterns detected. Read the content carefully before deciding.",
    className: "bg-amber-50 border-amber-200 text-amber-900",
    icon: AlertTriangle,
  },
  flagged: {
    label: "Strong AI signals — recommend reject",
    helper: "Multiple indicators of AI generation. Reject unless you have context that overrides.",
    className: "bg-red-50 border-red-200 text-red-900",
    icon: ShieldAlert,
  },
};

interface AiVerdictBannerProps {
  confidence: number | null | undefined;
  className?: string;
}

export function AiVerdictBanner({ confidence, className = "" }: AiVerdictBannerProps) {
  const verdict = verdictFromConfidence(confidence);
  const copy = VERDICT_COPY[verdict];
  const Icon = copy.icon;
  const pct = Math.round((confidence ?? 0) * 100);

  return (
    <div className={`border rounded-lg p-3 ${copy.className} ${className}`}>
      <div className="flex items-start gap-2">
        <Icon className="h-5 w-5 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-sm">{copy.label}</span>
            <span className="text-xs font-mono">{pct}% AI confidence</span>
          </div>
          <p className="text-xs mt-1 opacity-90">{copy.helper}</p>
          <ThresholdBar confidence={confidence ?? 0} />
        </div>
      </div>
    </div>
  );
}

/** Visual scale showing where the confidence sits relative to the safe / review / flag bands. */
function ThresholdBar({ confidence }: { confidence: number }) {
  const pct = Math.max(0, Math.min(1, confidence)) * 100;
  return (
    <div className="mt-2">
      <div className="relative h-2 rounded-full overflow-hidden bg-slate-200">
        <div className="absolute inset-y-0 left-0 w-[40%] bg-emerald-300/60" />
        <div className="absolute inset-y-0 left-[40%] w-[30%] bg-amber-300/60" />
        <div className="absolute inset-y-0 left-[70%] right-0 bg-red-300/60" />
        <div
          className="absolute top-[-2px] bottom-[-2px] w-[3px] bg-slate-900 rounded-full"
          style={{ left: `calc(${pct}% - 1.5px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] mt-0.5 opacity-70">
        <span>0% safe</span>
        <span>40% review</span>
        <span>70% flag</span>
        <span>100%</span>
      </div>
    </div>
  );
}

/** Compact verdict pill for list cards. */
export function AiVerdictPill({ confidence }: { confidence: number | null | undefined }) {
  const verdict = verdictFromConfidence(confidence);
  const copy = VERDICT_COPY[verdict];
  const Icon = copy.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${copy.className}`}>
      <Icon className="h-3 w-3" />
      {verdict === "safe" ? "Safe" : verdict === "review" ? "Review" : "Flag"}
    </span>
  );
}

interface AiSignalsBreakdownProps {
  analysis: AiAnalysis | null | undefined;
}

const SIGNAL_LABELS: Array<{ key: keyof AiAnalysis; label: string; help: string }> = [
  { key: "textPatterns",        label: "Text patterns",        help: "Repeated AI-style phrasing and structure" },
  { key: "repetitiveStructure", label: "Repetitive structure", help: "Sentences that follow the same skeleton" },
  { key: "vocabularyComplexity",label: "Vocabulary",           help: "Unusually formal or generic word choice" },
  { key: "naturalFlow",         label: "Lack of natural flow", help: "Stilted transitions between sentences" },
  { key: "personalTone",        label: "Lack of personal tone",help: "Missing voice, opinions, anecdotes" },
];

export function AiSignalsBreakdown({ analysis }: AiSignalsBreakdownProps) {
  if (!analysis) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Brain className="h-4 w-4" />
        Signal breakdown
      </h4>
      <div className="space-y-1.5">
        {SIGNAL_LABELS.map(({ key, label, help }) => {
          const v = analysis[key] ?? 0;
          const pct = Math.round(v * 100);
          const tone = v >= 0.7 ? "bg-red-500" : v >= 0.4 ? "bg-amber-500" : "bg-emerald-500";
          return (
            <div key={key} className="text-xs">
              <div className="flex justify-between mb-0.5">
                <span className="font-medium">{label}</span>
                <span className="font-mono text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{help}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
