import type { ReactNode } from "react";

import { colorOf } from "#/pages/leaderboard/model/model-color";
import type { TableColumn } from "#/pages/leaderboard/model/sorting";
import type { ModelResult } from "#/pages/leaderboard/model/summary";
import { percent, usd } from "#/pages/leaderboard/ui/format";

import { SortableTable } from "./sortable-table";

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

const IndexTable = ({ models }: Readonly<{ models: readonly ModelResult[] }>): ReactNode => (
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

export { IndexTable };
