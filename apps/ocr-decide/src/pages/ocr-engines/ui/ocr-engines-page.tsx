import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useJaBench } from "#/pages/ocr-engines/api/ja-bench-query";
import { COPY } from "#/pages/ocr-engines/model/copy";
import { tablesOf } from "#/pages/ocr-engines/model/tables";

import { EnginesSection } from "./engines-section";

const OcrEnginesPage = (): ReactNode => {
  const summary = useJaBench();
  return (
    <main className="vt-match mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 md:px-8">
      <h1 className="text-2xl font-bold">{COPY.title}</h1>
      <p className="text-sm leading-relaxed">{COPY.lead}</p>
      {pipe(
        tablesOf(summary),
        Arr.map((table) => <EnginesSection key={table.id} table={table} />),
      )}
      <Link to="/" className="text-sm underline underline-offset-4">
        {COPY.back}
      </Link>
    </main>
  );
};

export { OcrEnginesPage };
