import { cn } from "@masseater.dev/ui/cn";
import { Option } from "effect";
import { LoaderCircle } from "lucide-react";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { parseDraft } from "#/pages/interview/lib/draft";
import { useSession } from "#/pages/interview/model/hooks";
import type { Draft } from "#/pages/interview/model/hooks";
import { STRATEGIES } from "#strategies";

const noteOf = (draft: Draft): Readonly<{ failed: boolean; note: string; question: string }> => {
  const parsed = parseDraft(draft.text);
  return Option.match(parsed.error, {
    onNone: () => ({
      failed: draft.status === "failed",
      note: parsed.reason,
      question: parsed.question,
    }),
    onSome: (error) => ({ failed: true, note: error, question: parsed.question }),
  });
};

const CandidateCard = ({
  draft,
  choosing,
}: Readonly<{ draft: Draft; choosing: boolean }>): ReactNode => {
  const session = useSession();
  const { failed, note, question } = noteOf(draft);
  const ready = choosing && !failed;
  const { strategy } = draft;
  const onClick = useCallback(() => {
    if (Option.isSome(session)) {
      session.value.choose(strategy);
    }
  }, [session, strategy]);
  return (
    <button
      type="button"
      disabled={!ready}
      className={cn(
        "bg-card flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
        ready && "hover:border-primary hover:bg-accent",
      )}
      onClick={onClick}
    >
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        {STRATEGIES[strategy].label}
        {draft.status === "streaming" && <LoaderCircle className="size-3 animate-spin" />}
      </span>
      <span className="text-muted-foreground text-sm">{note}</span>
      <span className="text-lg leading-snug font-semibold">{question}</span>
    </button>
  );
};

export { CandidateCard };
