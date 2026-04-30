import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const EXAMPLES = [
  "Trial ending in 3 days for a $49/month design feedback tool. Offer 20% off annual.",
  "Feature announcement for a project management SaaS launching Slack approvals.",
  "Re-engage users who signed up for an AI meeting notes app but never connected calendar.",
];

type Props = {
  prompt: string;
  generating: boolean;
  onPromptChange: (prompt: string) => void;
  onGenerate: () => void;
};

export function LandingPrompt({ prompt, generating, onPromptChange, onGenerate }: Props) {
  const [exampleIndex, setExampleIndex] = useState(0);
  const tooShort = prompt.trim().length > 0 && prompt.trim().length < 10;
  const tooLong = prompt.length > 2000;
  const disabled = generating || prompt.trim().length < 10 || tooLong;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setExampleIndex((index) => (index + 1) % EXAMPLES.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-[1fr_440px]">
      <div>
        <p className="mb-5 inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-primary">
          Free, no login, export-ready
        </p>
        <h1 className="max-w-4xl font-serif text-5xl leading-[1.02] tracking-[-0.03em] text-slate-950 md:text-7xl">
          Generate SaaS emails you can actually ship.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Describe the email once. Get a subject line, preheader, MJML, HTML, and a chat loop for edits like “shorter”, “more direct”, or “make the CTA stronger”.
        </p>
        <div className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">GPT-4o structured output</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">MJML and HTML export</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">Sandboxed preview</div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-950">What do you need to send?</h2>
            <p className="text-sm text-slate-500">Be specific about product, audience, and CTA.</p>
          </div>
        </div>
        <Textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          placeholder={EXAMPLES[exampleIndex]}
          className="min-h-52 resize-none text-base"
          disabled={generating}
        />
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className={tooShort || tooLong ? "text-red-600" : "text-slate-500"}>
            {tooLong ? "Prompt must be 2000 characters or less." : tooShort ? "Use at least 10 characters." : "10-2000 characters"}
          </span>
          <span className={tooLong ? "text-red-600" : "text-slate-400"}>{prompt.length}/2000</span>
        </div>
        <Button className="mt-5 w-full" size="lg" disabled={disabled} onClick={onGenerate}>
          {generating ? "Generating draft..." : "Generate email"}
        </Button>
        <p className="mt-4 text-center text-xs text-slate-400">
          Primitive abuse protection is enabled. No account required.
        </p>
      </div>
    </section>
  );
}
