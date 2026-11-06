import { Array as Arr, Match, pipe } from "effect";
import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique";

import { ExampleView } from "./example-view";

const SEPARATOR = "\n";

const keyOf = (example: Example): string =>
  Match.value(example).pipe(
    Match.discriminatorsExhaustive("kind")({
      image: ({ kind, src, alt, credit }) =>
        Arr.join([kind, src, alt, credit.text, credit.href], SEPARATOR),
      youtube: ({ kind, id, title }) => Arr.join([kind, id, title], SEPARATOR),
      link: ({ kind, href, label }) => Arr.join([kind, href, label], SEPARATOR),
    }),
  );

const TechniqueExamples = ({ examples }: Readonly<{ examples: readonly Example[] }>): ReactNode => (
  <div className="flex flex-col gap-6">
    {pipe(
      examples,
      Arr.map((example) => <ExampleView example={example} key={keyOf(example)} />),
    )}
  </div>
);

export { TechniqueExamples };
