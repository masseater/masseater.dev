import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { useInspect } from "#/pages/inspect/api/use-inspect";
import { COPY } from "#/pages/inspect/model/copy";
import { useRun } from "#/pages/inspect/model/draft";

import { InspectForm } from "./inspect-form";
import { RunView } from "./run-view";

const InspectPage = (): ReactNode => {
  const state = useInspect(useRun());
  return (
    <main className="vt-match mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 md:px-8">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-mono text-2xl font-bold">{COPY.title}</h1>
        <Link to="/why" className="text-primary text-sm underline-offset-4 hover:underline">
          {COPY.why}
        </Link>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <InspectForm state={state} />
        <RunView state={state} />
      </div>
    </main>
  );
};

export { InspectPage };
