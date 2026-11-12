import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useManuscripts } from "#/pages/manuscripts/api/manuscripts.ts";

import { ManuscriptRow } from "./manuscript-row.tsx";

const LABEL = "原稿";

const ManuscriptList = (): ReactNode => (
  <ul aria-label={LABEL}>
    {pipe(
      useManuscripts(),
      Array.map((manuscript) => <ManuscriptRow key={manuscript.id} manuscript={manuscript} />),
    )}
  </ul>
);

export { ManuscriptList };
