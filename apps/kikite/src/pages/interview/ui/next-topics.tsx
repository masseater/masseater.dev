import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { useSummary } from "#/entities/interview";

const LABEL = "次に聞くこと";

export const NextTopics = (): ReactNode => {
  const next = pipe(
    useSummary(),
    Option.match({ onNone: Arr.empty<string>, onSome: (summary) => summary.next }),
  );
  return (
    Arr.isReadonlyArrayNonEmpty(next) && (
      <section className="hidden shrink-0 flex-col gap-2 lg:flex">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider">{LABEL}</h2>
        <ul className="text-muted-foreground marker:text-muted-foreground/60 grid list-disc grid-cols-2 gap-x-8 gap-y-1 pl-4 text-sm leading-relaxed">
          {pipe(
            next,
            Arr.map((topic) => (
              <li key={topic} className="wrap-anywhere">
                {topic}
              </li>
            )),
          )}
        </ul>
      </section>
    )
  );
};
