import { Array as Arr, Boolean as Bool, Option, Schema, String as Str, pipe } from "effect";

export const CATEGORIES = [
  "salary",
  "business",
  "other-income",
  "housing",
  "food",
  "living",
  "infrastructure",
  "hobby",
  "other-expense",
  "transfer",
] as const;

export const CategorySchema = Schema.Literals(CATEGORIES);

export type Category = typeof CategorySchema.Type;

export type Flow = "income" | "expense" | "transfer";

export type Rule = Readonly<{ pattern: string; category: Category; label: Option.Option<string> }>;

export type Decision = Readonly<{ category: Category; label: Option.Option<string> }>;

export type Described = Readonly<{ amount: number; normalized: string }>;

const FLOWS: Readonly<Record<Category, Flow>> = {
  salary: "income",
  business: "income",
  "other-income": "income",
  housing: "expense",
  food: "expense",
  living: "expense",
  infrastructure: "expense",
  hobby: "expense",
  "other-expense": "expense",
  transfer: "transfer",
};

export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  salary: "給与",
  business: "事業・副業",
  "other-income": "その他の収入",
  housing: "住居",
  food: "食費",
  living: "生活",
  infrastructure: "インフラ",
  hobby: "趣味・娯楽",
  "other-expense": "その他の支出",
  transfer: "振替",
};

const NO_AMOUNT = 0;

export const flowOf = (category: Category): Flow => FLOWS[category];

const infrastructure = (pattern: string, label: string): Rule => ({
  pattern,
  category: "infrastructure",
  label: Option.some(label),
});

export const BUILT_IN_RULES: readonly Rule[] = [
  infrastructure("CLOUDFLARE", "Cloudflare"),
  infrastructure("ANTHROPIC", "Claude"),
  infrastructure("CLAUDE.AI", "Claude"),
  infrastructure("OPENROUTER", "OpenRouter"),
  infrastructure("FAL.AI", "fal"),
];

export const normalized = (text: string): string =>
  pipe(text, Str.normalize("NFKC"), Str.toUpperCase);

const fallbackOf = (amount: number): Decision => ({
  category: Bool.match(amount > NO_AMOUNT, {
    onTrue: (): Category => "other-income",
    onFalse: (): Category => "other-expense",
  }),
  label: Option.none(),
});

export const decide =
  (rules: readonly Rule[]) =>
  ({ amount, normalized: text }: Described): Decision =>
    pipe(
      [...BUILT_IN_RULES, ...rules],
      Arr.findLast(({ pattern }) => Str.includes(normalized(pattern))(text)),
      Option.map(({ category, label }): Decision => ({ category, label })),
      Option.getOrElse(() => fallbackOf(amount)),
    );
