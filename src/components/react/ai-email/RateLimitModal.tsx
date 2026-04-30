import { useEffect, useMemo, useState } from "react";
import type { RateLimitBlock } from "./types";
import { Button } from "@/components/ui/button";

function formatCountdown(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

type Props = {
  block: RateLimitBlock;
  onClose: () => void;
};

export function RateLimitModal({ block, onClose }: Props) {
  const resetAtMs = useMemo(() => Date.parse(block.resetAt), [block.resetAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = resetAtMs - now;
  const isExpired = Number.isFinite(resetAtMs) && remainingMs <= 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-soft"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Rate limit</p>
        <h2 className="mt-2 font-serif text-3xl text-slate-950">You’ve hit the free limit</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This tool is free and unauthenticated, so we apply lightweight abuse protection.
        </p>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">
            {block.type === "hourly" ? "Hourly limit reached" : "Daily limit reached"} for{" "}
            <span className="capitalize">{block.action}</span>.
          </p>
          <p className="mt-2">
            {isExpired ? (
              "You can try again now."
            ) : (
              <>
                Try again in <span className="font-semibold">{formatCountdown(remainingMs)}</span>.
              </>
            )}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <a href="https://digistorms.ai" target="_blank" rel="noreferrer">
              Get notified when unlimited is live
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

