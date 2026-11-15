import { Array as Arr, Effect, Option, pipe } from "effect";

import { BUILT_IN_RULES, CATEGORIES, CATEGORY_LABELS, flowOf } from "#/entities/ledger";
import type { Rule } from "#/entities/ledger";
import { listAccounts, userRules } from "#/entities/ledger/index.server";

const CATEGORY_LIST = pipe(
  CATEGORIES,
  Arr.map((id) => ({ id, label: CATEGORY_LABELS[id], flow: flowOf(id) })),
);

const plainRules = Arr.map(({ pattern, category, label }: Rule) => ({
  pattern,
  category,
  label: Option.getOrNull(label),
}));

export const settings = Effect.all({ accounts: listAccounts, rules: userRules }).pipe(
  Effect.map(({ accounts, rules }) => ({
    accounts,
    categories: CATEGORY_LIST,
    rules: { builtIn: plainRules(BUILT_IN_RULES), user: plainRules(rules) },
  })),
);
