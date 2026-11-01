import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Example } from "#/entities/technique/model/technique";

import { ExampleView } from "./example-view";

const TechniqueExamples = ({ examples }: Readonly<{ examples: readonly Example[] }>): ReactNode => (
  <div className="flex flex-col gap-6">
    {pipe(
      examples,
      Arr.map((example) => <ExampleView example={example} key={JSON.stringify(example)} />),
    )}
  </div>
);

export { TechniqueExamples };
