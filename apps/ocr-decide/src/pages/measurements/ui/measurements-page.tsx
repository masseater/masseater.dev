import { Link } from "@tanstack/react-router";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useSummary } from "#/pages/measurements/api/summary-query";
import { COPY } from "#/pages/measurements/model/copy";
import { tablesOf } from "#/pages/measurements/model/tables";

import { RunsSection } from "./runs-section";

const MeasurementsPage = (): ReactNode => {
  const summary = useSummary();
  return (
    <main className="vt-match mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 md:px-8">
      <h1 className="text-2xl font-bold">{COPY.title}</h1>
      {pipe(
        tablesOf(summary),
        Arr.map((table) => <RunsSection key={table.id} table={table} />),
      )}
      <Link to="/" className="text-sm underline underline-offset-4">
        {COPY.demo}
      </Link>
    </main>
  );
};

export { MeasurementsPage };
