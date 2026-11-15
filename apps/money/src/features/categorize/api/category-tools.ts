import { OVERWRITE, READ_ONLY, WRITE, one } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, Option, pipe } from "effect";

import {
  BUILT_IN_RULES,
  CATEGORIES,
  CATEGORY_LABELS,
  flowOf,
  listAccounts,
  deleteRule,
  setCategory,
  setRule,
  userRules,
  DeleteRuleInput,
  EmptyInput,
  SetCategoryInput,
  SetRuleInput,
  registerAll,
  tool,
} from "#/entities/ledger/index.ts";
import type { Rule } from "#/entities/ledger/index.ts";

const CATEGORY_LIST = pipe(
  CATEGORIES,
  Arr.map((id) => ({ id, label: CATEGORY_LABELS[id], flow: flowOf(id) })),
);

const plainRules = Arr.map(({ pattern, category, label }: Rule) => ({
  pattern,
  category,
  label: Option.getOrNull(label),
}));

const settings = Effect.all({ accounts: listAccounts, rules: userRules }).pipe(
  Effect.map(({ accounts, rules }) => ({
    accounts,
    categories: CATEGORY_LIST,
    rules: { builtIn: plainRules(BUILT_IN_RULES), user: plainRules(rules) },
  })),
);

/** @internal */
export const CATEGORY_TOOLS = [
  tool({
    name: "set_category",
    description:
      "取引 1 件のカテゴリーを手で決める。手で決めた取引は規則が変わっても変わらない。auto で規則に戻す。",
    input: SetCategoryInput,
    annotations: WRITE,
    run: ({ transactionId, category, label }) =>
      setCategory({ transactionId, category, label: Option.fromUndefinedOr(label) }),
    count: one,
  }),
  tool({
    name: "set_category_rule",
    description:
      "摘要に pattern を含む取引のカテゴリーを決める規則を足すか置き換え、手で決めていない取引すべてに当て直す。後から足した規則ほど優先し、組み込みの規則より優先する。",
    input: SetRuleInput,
    annotations: WRITE,
    run: ({ pattern, category, label }) =>
      setRule({ pattern, category, label: Option.fromUndefinedOr(label) }),
    count: one,
  }),
  tool({
    name: "delete_category_rule",
    description: "自分で足した規則を消し、手で決めていない取引すべてに残りの規則を当て直す。",
    input: DeleteRuleInput,
    annotations: OVERWRITE,
    run: ({ pattern }) => deleteRule(pattern),
    count: one,
  }),
  tool({
    name: "get_settings",
    description: "口座、カテゴリー、カテゴリーの規則（組み込みと自分で足したもの）を返す。",
    input: EmptyInput,
    annotations: READ_ONLY,
    run: () => settings,
    count: ({ accounts }) => accounts.length,
  }),
];

/** @internal */
export const registerCategoryTools = registerAll(CATEGORY_TOOLS);
