import type { ReactNode } from "react";

import type { EnglishRow } from "#/pages/leaderboard/model/english";
import { colorOf } from "#/pages/leaderboard/model/model-color";
import type { TableColumn } from "#/pages/leaderboard/model/sorting";
import { gap, percent } from "#/pages/leaderboard/ui/format";

import { SortableTable } from "./sortable-table";

const CAPTION = "英語（DecideBench）と日本語（業務ルール判定）の正解率";
const LABEL = "モデル";

const keyOf = ({ model }: EnglishRow): string => model.model;
const labelOf = ({ model }: EnglishRow): string => model.label;
const modelColor = ({ model }: EnglishRow): string => colorOf(model.model);

const accuracyDrop = ({ english, japanese }: EnglishRow): number =>
  japanese.accuracy - english.accuracy;
const pairDrop = ({ english, japanese }: EnglishRow): number =>
  japanese.pairAccuracy - english.pairAccuracy;

const COLUMNS: readonly TableColumn<EnglishRow>[] = [
  {
    id: "english-accuracy",
    header: "英語 正解率",
    sortValue: ({ english }) => english.accuracy,
    display: ({ english }) => percent(english.accuracy),
  },
  {
    id: "japanese-accuracy",
    header: "日本語 正解率",
    sortValue: ({ japanese }) => japanese.accuracy,
    display: ({ japanese }) => percent(japanese.accuracy),
  },
  {
    id: "accuracy-drop",
    header: "差",
    sortValue: accuracyDrop,
    display: (row) => gap(accuracyDrop(row)),
  },
  {
    id: "english-pairs",
    header: "英語 対の正解率",
    sortValue: ({ english }) => english.pairAccuracy,
    display: ({ english }) => percent(english.pairAccuracy),
  },
  {
    id: "japanese-pairs",
    header: "日本語 対の正解率",
    sortValue: ({ japanese }) => japanese.pairAccuracy,
    display: ({ japanese }) => percent(japanese.pairAccuracy),
  },
  {
    id: "pair-drop",
    header: "差",
    sortValue: pairDrop,
    display: (row) => gap(pairDrop(row)),
  },
];

const EnglishTable = ({ rows }: Readonly<{ rows: readonly EnglishRow[] }>): ReactNode => (
  <SortableTable
    id="english"
    caption={CAPTION}
    label={LABEL}
    rows={rows}
    keyOf={keyOf}
    colorOf={modelColor}
    labelOf={labelOf}
    columns={COLUMNS}
  />
);

export { EnglishTable };
