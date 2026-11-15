import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { useManuscripts, ManuscriptRow } from "#/entities/manuscript";
import { ExportButton } from "#/features/export-manuscript";

const LABEL = "原稿";

export const ManuscriptList = (): ReactNode => (
  <ul aria-label={LABEL}>
    {pipe(
      useManuscripts(),
      Array.map((manuscript) => (
        <ManuscriptRow key={manuscript.id} manuscript={manuscript}>
          <ExportButton id={manuscript.id} />
        </ManuscriptRow>
      )),
    )}
  </ul>
);
