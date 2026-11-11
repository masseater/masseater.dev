import { Button } from "@masseater.dev/ui/button";
import { Option, String as Str } from "effect";
import { SendHorizontal } from "lucide-react";
import { useCallback } from "react";
import type { ChangeEvent, SubmitEvent, ReactNode } from "react";

import { useAnswerDraft, useSession, useSetAnswerDraft } from "#/pages/interview/model/hooks";

const LABEL = "文字で答える";
const SEND = "送る";

const AnswerBox = (): ReactNode => {
  const session = useSession();
  const text = useAnswerDraft();
  const setText = useSetAnswerDraft();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setText(event.target.value);
    },
    [setText],
  );
  const onSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const answer = Str.trim(text);
      if (Str.isNonEmpty(answer)) {
        if (Option.isSome(session)) {
          session.value.answer(answer);
        }
        setText("");
      }
    },
    [session, setText, text],
  );
  return (
    <form className="flex gap-2" onSubmit={onSubmit}>
      <input
        aria-label={LABEL}
        className="border-input bg-background focus-visible:ring-ring/50 min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-3"
        value={text}
        onChange={onChange}
      />
      <Button type="submit" variant="outline" size="icon" aria-label={SEND} title={SEND}>
        <SendHorizontal />
      </Button>
    </form>
  );
};

export { AnswerBox };
