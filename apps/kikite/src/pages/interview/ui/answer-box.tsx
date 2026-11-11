import { Option, String as Str } from "effect";
import { Keyboard } from "lucide-react";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode, SubmitEvent } from "react";

import { useAnswerDraft, useSession } from "#/pages/interview/model/hooks";

import { ANSWER_ID } from "./type-anywhere.ts";

const LABEL = "文字で答える";

const AnswerBox = (): ReactNode => {
  const session = useSession();
  const text = useAnswerDraft();
  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (Option.isSome(session)) {
        session.value.typing(event.target.value);
      }
    },
    [session],
  );
  const onSubmit = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      event.preventDefault();
      const answer = Str.trim(text);
      if (Option.isSome(session) && Str.isNonEmpty(answer)) {
        session.value.typed(answer);
      }
    },
    [session, text],
  );
  return (
    <form
      className="text-muted-foreground focus-within:text-foreground flex items-center gap-3"
      onSubmit={onSubmit}
    >
      <Keyboard className="size-5 shrink-0" />
      <input
        id={ANSWER_ID}
        aria-label={LABEL}
        autoComplete="off"
        enterKeyHint="send"
        className="text-foreground min-w-0 flex-1 bg-transparent py-2 text-lg outline-none"
        value={text}
        onChange={onChange}
      />
    </form>
  );
};

export { AnswerBox };
