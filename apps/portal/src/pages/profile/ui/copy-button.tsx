import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Button } from "@masseater.dev/ui/button";
import { Duration, Effect, pipe } from "effect";
import { Atom } from "effect/reactivity";
import { useCallback, useRef } from "react";
import type { ReactNode } from "react";

import { markdownOf } from "#/entities/watashi/index.ts";
import type { ProfileSectionValue } from "#/entities/watashi/index.ts";

const TEXT = { copy: "コピー", copied: "コピーした", failed: "コピーできなかった" } as const;

const SHOWN_SECONDS = 2;

const SHOWN = Duration.seconds(SHOWN_SECONDS);

const REPEAT_MARK = " ";

const CLEARED = "";

const FIRST_TURN = 0;

const waiting = Effect.sleep(SHOWN);

const messageAtom = Atom.make(CLEARED);

const announced = ({ last, text }: Readonly<{ last: string; text: string }>): string => {
  if (text === last) {
    return `${text}${REPEAT_MARK}`;
  }
  return text;
};

export const CopyButton = ({
  sections,
}: Readonly<{ sections: readonly ProfileSectionValue[] }>): ReactNode => {
  const message = useAtomValue(messageAtom);
  const setMessage = useAtomSet(messageAtom);
  const lastRef = useRef(CLEARED);
  const turnRef = useRef(FIRST_TURN);
  const copy = useCallback(() => {
    turnRef.current += 1;
    const turn = turnRef.current;
    setMessage(CLEARED);
    const show = (text: string): Effect.Effect<void> =>
      Effect.sync(() => {
        lastRef.current = announced({ last: lastRef.current, text });
        setMessage(lastRef.current);
      });
    const clear = Effect.sync(() => {
      if (turnRef.current === turn) {
        setMessage(CLEARED);
      }
    });
    const writing = Effect.tryPromise({
      try: () => navigator.clipboard.writeText(markdownOf(sections)),
      catch: () => TEXT.failed,
    });
    Effect.runFork(
      pipe(
        writing,
        Effect.match({ onSuccess: () => TEXT.copied, onFailure: (failed) => failed }),
        Effect.flatMap(show),
        Effect.andThen(waiting),
        Effect.andThen(clear),
      ),
    );
  }, [sections, setMessage]);
  return (
    <div className="mb-2 flex items-center gap-2">
      <output className="text-muted-foreground text-xs">{message}</output>
      <Button onClick={copy} size="sm" type="button" variant="outline">
        {TEXT.copy}
      </Button>
    </div>
  );
};
