import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useManuscripts, ManuscriptRow } from "#/entities/manuscript";

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
