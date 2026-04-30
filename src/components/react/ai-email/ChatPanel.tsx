import { useState } from "react";
import { Send, RotateCcw } from "lucide-react";
import type { ChatMessage } from "./types";
import { useAutoScroll } from "@/hooks/useAutoScroll";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  messages: ChatMessage[];
  refining: boolean;
  onSend: (message: string) => void;
  onReset: () => void;
};

export function ChatPanel({ messages, refining, onSend, onReset }: Props) {
  const [draft, setDraft] = useState("");
  const scrollRef = useAutoScroll(messages);

  const submit = () => {
    const value = draft.trim();
    if (!value || refining) return;
    setDraft("");
    onSend(value);
  };

  return (
    <aside className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-soft lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-950">Refine in chat</h2>
          <p className="text-sm text-slate-500">Ask for copy, structure, or CTA changes.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} disabled={refining || messages.length === 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      <div ref={scrollRef} className="mb-4 max-h-[360px] space-y-3 overflow-auto rounded-2xl bg-slate-50 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">
            Once your first draft is ready, ask for changes like “make it punchier” or “add urgency without sounding salesy”.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-6",
                message.role === "user"
                  ? "ml-6 bg-primary text-white"
                  : message.status === "error"
                    ? "mr-6 bg-red-50 text-red-700"
                    : "mr-6 bg-white text-slate-700",
              )}
            >
              <p>{message.content}</p>
              {message.status === "streaming" && (
                <p className="mt-2 text-xs opacity-70">Working...</p>
              )}
            </div>
          ))
        )}
      </div>

      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Make the CTA more urgent, but keep it calm..."
          className="min-h-24 resize-none"
          disabled={refining}
        />
        <Button className="w-full" onClick={submit} disabled={refining || draft.trim().length === 0}>
          <Send className="h-4 w-4" /> {refining ? "Refining..." : "Send refinement"}
        </Button>
      </div>
    </aside>
  );
}
