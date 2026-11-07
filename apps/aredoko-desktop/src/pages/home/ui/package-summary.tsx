import type { Summary } from "@masseater.dev/aredoko-protocol";
import { Array, pipe } from "effect";
import type { ReactNode } from "react";

import { KindCounts } from "./kind-counts.tsx";
import { SummaryField } from "./summary-field.tsx";

const fieldsOf = (
  summary: typeof Summary.Type,
): readonly Readonly<{ label: string; values: readonly string[] }>[] =>
  pipe(
    [
      { label: "対応アバター", values: summary.avatars },
      { label: "シェーダー", values: summary.shaders },
      { label: "色", values: summary.colors },
    ],
    Array.filter(({ values }) => Array.isReadonlyArrayNonEmpty(values)),
  );

const PackageSummary = ({ summary }: Readonly<{ summary: typeof Summary.Type }>): ReactNode => (
  <div className="flex flex-col gap-4">
    <KindCounts counts={summary.counts} />
    <dl className="flex flex-col gap-3">
      {pipe(
        fieldsOf(summary),
        Array.map(({ label, values }) => (
          <SummaryField key={label} label={label} values={values} />
        )),
      )}
    </dl>
  </div>
);

export { PackageSummary };
