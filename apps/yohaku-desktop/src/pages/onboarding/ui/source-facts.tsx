import type { Source } from "@masseater.dev/yohaku-protocol";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { RevertButton, useSourceFacts } from "#/entities/source";

import { FactRow } from "./fact-row.tsx";

const SourceFacts = ({ source }: Readonly<{ source: typeof Source.Type }>): ReactNode => {
  const facts = useSourceFacts(source.id);
  return (
    <li className="flex flex-col gap-2.5 rounded-md border px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="min-w-0 grow truncate font-medium">{source.label}</span>
        <RevertButton source={source} />
      </div>
      <ul aria-label={source.label} className="flex flex-col gap-1.5">
        {pipe(
          facts,
          Array.map((fact) => (
            <FactRow key={`${fact.kind}:${fact.subject}:${fact.body}`} fact={fact} />
          )),
        )}
      </ul>
    </li>
  );
};

export { SourceFacts };
