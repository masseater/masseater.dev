import { percent } from "bench-summary/format";
import type { ReactNode } from "react";

import { colorOf, usd } from "#/entities/benchmark/index.ts";
import type { ModelResult } from "#/entities/benchmark/index.ts";
import type { TableColumn } from "#/features/sort-table/index.ts";
import { SortableTable } from "#/features/sort-table/index.ts";

const CAPTION = "指数と費用";
const LABEL = "モデル";

const keyOf = ({ model }: ModelResult): string => model;
const labelOf = ({ label }: ModelResult): string => label;
const modelColor = ({ model }: ModelResult): string => colorOf(model);

const COLUMNS: readonly TableColumn<ModelResult>[] = [
  {
    id: "index",
    header: "指数",
    sortValue: ({ index }) => index,
    display: ({ index }) => percent(index),
  },
  {
    id: "cost",
    header: "全タスクの費用",
    sortValue: ({ costUsd }) => costUsd,
    display: ({ costUsd }) => usd(costUsd),
  },
];

export const IndexTable = ({ models }: Readonly<{ models: readonly ModelResult[] }>): ReactNode => (
  <SortableTable
    id="index"
    caption={CAPTION}
    label={LABEL}
    rows={models}
    keyOf={keyOf}
    colorOf={modelColor}
    labelOf={labelOf}
    columns={COLUMNS}
  />
);
