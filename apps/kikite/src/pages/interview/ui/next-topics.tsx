import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSummary } from "#/pages/interview/model/hooks";

const LABEL = "次に聞くこと";

const NextTopics = (): ReactNode => {
  const next = pipe(
    useSummary(),
    Option.match({ onNone: Arr.empty<string>, onSome: (summary) => summary.next }),
  );
  return (
    Arr.isReadonlyArrayNonEmpty(next) && (
      <section className="hidden flex-col gap-2 lg:flex">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider">{LABEL}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {pipe(next, Arr.join("　／　"))}
        </p>
      </section>
    )
  );
};

export { NextTopics };
