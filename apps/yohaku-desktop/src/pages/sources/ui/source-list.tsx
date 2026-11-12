import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useSources } from "#/pages/sources/api/sources.ts";

import { SourceRow } from "./source-row.tsx";

const SourceList = ({ label }: Readonly<{ label: string }>): ReactNode => (
  <ul aria-label={label}>
    {pipe(
      useSources(),
      Array.map((source) => <SourceRow key={source.id} source={source} />),
    )}
  </ul>
);

export { SourceList };
