import { useCallback } from "react";
import type { ReactNode } from "react";

import { mountPlayground } from "#/features/playground/model/mount.ts";
import { useReport } from "#/features/playground/model/output.ts";

import { ConsolePanel } from "./console-panel.tsx";
import { GeneratedPanel } from "./generated-panel.tsx";
import { SourcePanel } from "./source-panel.tsx";

export const Playground = (): ReactNode => {
  const report = useReport();
  const mount = useCallback(
    (container: HTMLElement) => mountPlayground({ container, report }),
    [report],
  );
  return (
    <section ref={mount} className="flex flex-col gap-3">
      <div className="grid gap-3 lg:h-120 lg:grid-cols-2">
        <SourcePanel />
        <GeneratedPanel />
      </div>
      <ConsolePanel />
    </section>
  );
};
