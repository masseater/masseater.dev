import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { SAMPLE } from "#/pages/why/model/copy";

const LOOK = {
  kept: "",
  removed: "text-muted-foreground line-through",
} as const;

const Example = (): ReactNode => (
  <p className="rounded-lg border p-5 text-sm leading-relaxed">
    {pipe(
      SAMPLE,
      Arr.map(({ text, kind }) => (
        <span key={text} className={LOOK[kind]}>
          {text}
        </span>
      )),
    )}
  </p>
);

export { Example };
