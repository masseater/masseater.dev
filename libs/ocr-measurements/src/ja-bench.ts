import { Schema, Array as Arr, pipe } from "effect";

const CATEGORIES = [
  { id: "horizontal-mincho", label: "横書き（明朝）", source: "synthetic" },
  { id: "horizontal-gothic", label: "横書き（ゴシック）", source: "synthetic" },
  { id: "vertical", label: "縦書き", source: "synthetic" },
  { id: "mixed-script", label: "和欧混植", source: "synthetic" },
  { id: "rare-kanji", label: "難読漢字・旧字体", source: "synthetic" },
  { id: "small-text", label: "小さい文字", source: "synthetic" },
  { id: "degraded-scan", label: "劣化したスキャン", source: "synthetic" },
  { id: "handwriting-font", label: "手書き風フォント", source: "synthetic" },
  { id: "handwriting-horizontal", label: "手書き（横書き）", source: "jawildtext" },
  { id: "handwriting-vertical", label: "手書き（縦書き）", source: "jawildtext" },
  { id: "receipt-photo", label: "レシートの写真", source: "jawildtext" },
] as const;

const CategoryIdSchema = Schema.Literals(
  pipe(
    CATEGORIES,
    Arr.map(({ id }) => id),
  ),
);

const RateMapSchema = Schema.Record(Schema.String, Schema.Finite);

const EngineRunSchema = Schema.Struct({
  engine: Schema.String,
  label: Schema.String,
  kind: Schema.Literals(["local", "vlm"]),
  machine: Schema.String,
  accuracy: Schema.Finite,
  charF1: Schema.Finite,
  byCategory: RateMapSchema,
  charF1ByCategory: RateMapSchema,
  secondsPerPage: Schema.Finite,
  usdPerPage: Schema.Finite,
  failed: Schema.Finite,
});

const JaBenchSummarySchema = Schema.Struct({
  generatedAt: Schema.String,
  pages: Schema.Finite,
  categories: Schema.Array(
    Schema.Struct({
      id: CategoryIdSchema,
      label: Schema.String,
      source: Schema.String,
      pages: Schema.Finite,
    }),
  ),
  runs: Schema.Array(EngineRunSchema),
});

type CategoryId = typeof CategoryIdSchema.Type;

type EngineRun = typeof EngineRunSchema.Type;

type JaBenchSummary = typeof JaBenchSummarySchema.Type;

export { CATEGORIES, CategoryIdSchema, JaBenchSummarySchema };
export type { CategoryId, EngineRun, JaBenchSummary };
