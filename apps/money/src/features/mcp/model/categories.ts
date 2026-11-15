import { Schema } from "effect";

const INCOME_CATEGORIES = ["salary", "business", "other-income"] as const;

const EXPENSE_CATEGORIES = [
  "housing",
  "food",
  "living",
  "infrastructure",
  "hobby",
  "other-expense",
] as const;

const TRANSFER = "transfer";

const CATEGORIES = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES, TRANSFER] as const;

const Category = Schema.Literals(CATEGORIES);

type Category = typeof Category.Type;

type Flow = "income" | "expense" | "transfer";

const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
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

const isIncome = Schema.is(Schema.Literals(INCOME_CATEGORIES));

const isExpense = Schema.is(Schema.Literals(EXPENSE_CATEGORIES));

const flowOf = (category: Category): Flow => {
  if (isIncome(category)) {
    return "income";
  }
  if (isExpense(category)) {
    return "expense";
  }
  return "transfer";
};

const fallbackCategory = (amount: number): Category =>
  amount > 0 ? "other-income" : "other-expense";

type Rule = Readonly<{ pattern: string; category: Category; label: string | null }>;

const infrastructure = (pattern: string, label: string): Rule => ({
  pattern,
  category: "infrastructure",
  label,
});

const BUILT_IN_RULES: readonly Rule[] = [
  infrastructure("CLOUDFLARE", "Cloudflare"),
  infrastructure("ANTHROPIC", "Claude"),
  infrastructure("CLAUDE.AI", "Claude"),
  infrastructure("OPENROUTER", "OpenRouter"),
  infrastructure("FAL.AI", "fal"),
];

const normalized = (text: string): string => text.normalize("NFKC").toUpperCase();

export {
  BUILT_IN_RULES,
  CATEGORIES,
  CATEGORY_LABELS,
  Category,
  fallbackCategory,
  flowOf,
  normalized,
};
export type { Flow, Rule };
