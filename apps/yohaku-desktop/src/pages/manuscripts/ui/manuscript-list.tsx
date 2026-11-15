import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useManuscripts } from "#/entities/manuscript";

import { ManuscriptEntry } from "./manuscript-entry.tsx";

const LABEL = "原稿";

const ManuscriptList = (): ReactNode => (
  <ul aria-label={LABEL}>
    {pipe(
      useManuscripts(),
      Array.map((manuscript) => <ManuscriptEntry key={manuscript.id} manuscript={manuscript} />),
    )}
  </ul>
);

export { ManuscriptList };
