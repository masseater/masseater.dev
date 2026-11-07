import { Array as Arr, Option, pipe } from "effect";
import { useCallback } from "react";
import type { ChangeEvent, ReactNode } from "react";

import { COPY } from "#/pages/inspect/model/copy";
import { useDraftText, useSetDraftText } from "#/pages/inspect/model/draft";
import { EXAMPLES } from "#/pages/inspect/model/examples";
import type { Example } from "#/pages/inspect/model/examples";

import { SELECT_CLASS } from "./select-class";

const GROUPS = [
  { kind: "injected", label: COPY.injected },
  { kind: "clean", label: COPY.clean },
] as const satisfies readonly { kind: Example["kind"]; label: string }[];

const UNPICKED = "";

const ExampleList = (): ReactNode => {
  const text = useDraftText();
  const setText = useSetDraftText();
  const picked = Arr.findFirst(EXAMPLES, (example) => example.text === text).pipe(
    Option.match({ onNone: () => UNPICKED, onSome: ({ name }) => name }),
  );
  const pick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      Option.map(
        Arr.findFirst(EXAMPLES, ({ name }) => name === event.target.value),
        (example) => {
          setText(example.text);
        },
      );
    },
    [setText],
  );
  return (
    <select aria-label={COPY.examples} value={picked} onChange={pick} className={SELECT_CLASS}>
      <option value={UNPICKED} disabled>
        {COPY.examples}
      </option>
      {pipe(
        GROUPS,
        Arr.map(({ kind, label }) => (
          <optgroup key={kind} label={label}>
            {pipe(
              EXAMPLES,
              Arr.filter((example) => example.kind === kind),
              Arr.map(({ name }) => (
                <option key={name} value={name}>
                  {name}
                </option>
              )),
            )}
          </optgroup>
        )),
      )}
    </select>
  );
};

export { ExampleList };
