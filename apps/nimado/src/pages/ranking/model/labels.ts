import type { KindValue, PeriodValue, SortValue } from "./search";

type Choices<Value extends string> = readonly (readonly [Value, string])[];

const SORT_LABELS: Choices<SortValue> = [
  ["youtube", "YouTube"],
  ["nico", "ニコニコ"],
  ["youtube-lead", "YouTube が多い"],
  ["nico-lead", "ニコニコが多い"],
];

const PERIOD_LABELS: Choices<PeriodValue> = [
  ["all", "累計"],
  ["1", "1 日"],
  ["7", "7 日"],
  ["30", "30 日"],
  ["custom", "期間指定"],
];

const KIND_LABELS: Choices<KindValue> = [
  ["original", "オリジナル"],
  ["all", "カバーも含む"],
];

const TEXT = {
  title: "nimado",
  about: "このサイトについて",
  sort: "並び順",
  period: "期間",
  kind: "種類",
  search: "曲名・作者",
  from: "から",
  to: "まで",
  rank: "#",
  song: "曲",
  nico: "ニコニコ",
  youtube: "YouTube",
  gap: "差",
  vocadb: "VocaDB",
  previous: "前へ",
  next: "次へ",
  loading: "読み込み中",
  failed: "データを読み込めませんでした",
  short: "この期間のデータはまだない",
  empty: "該当なし",
  asOf: "時点",
} as const;

export type { Choices };
export { KIND_LABELS, PERIOD_LABELS, SORT_LABELS, TEXT };
