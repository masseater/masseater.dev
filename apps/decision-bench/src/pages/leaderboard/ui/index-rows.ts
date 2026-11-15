import { Array as Arr, pipe } from "effect";

import { colorOf, indexDetail } from "#/entities/benchmark";
import type { ModelResult, ChartRow } from "#/entities/benchmark";

const rowsOf = (models: readonly ModelResult[]): readonly ChartRow[] =>
  pipe(
    models,
    Arr.map((model) => ({
      status: "point",
      key: model.model,
      label: model.label,
      color: colorOf(model.model),
      detail: indexDetail(model),
      ratio: model.index,
    })),
  );

export { rowsOf };
