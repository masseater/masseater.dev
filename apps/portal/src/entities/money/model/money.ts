import { Schema } from "effect";

const Month = Schema.String.check(Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])$/u));

const FLOW_VIEWS = ["detail", "summary"] as const;

export const MoneySearch = Schema.Struct({
  from: Schema.optionalKey(Month),
  to: Schema.optionalKey(Month),
  cursor: Schema.optionalKey(Schema.String),
  account: Schema.optionalKey(Schema.String),
  category: Schema.optionalKey(Schema.String),
  flow: Schema.optionalKey(Schema.Literals(FLOW_VIEWS)),
});

export const PeriodInput = Schema.Struct({
  from: Schema.optionalKey(Month),
  to: Schema.optionalKey(Month),
});

const Period = Schema.Struct({ from: Month, to: Month });

export const TransactionsInput = Schema.Struct({
  from: Month,
  to: Month,
  cursor: Schema.optionalKey(Schema.String),
  account: Schema.optionalKey(Schema.String),
  category: Schema.optionalKey(Schema.String),
});

const NODE_TYPES = ["income", "income-sub", "total", "expense", "expense-sub"] as const;

const FlowNode = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  nodeType: Schema.Literals(NODE_TYPES),
});

const FlowLink = Schema.Struct({
  source: Schema.String,
  target: Schema.String,
  value: Schema.Finite,
});

export const MoneyFlow = Schema.Struct({
  nodes: Schema.Array(FlowNode),
  links: Schema.Array(FlowLink),
  income: Schema.Finite,
  expense: Schema.Finite,
});

export const MonthTotal = Schema.Struct({
  month: Schema.String,
  income: Schema.Finite,
  expense: Schema.Finite,
  balance: Schema.Finite,
});

const AccountBalance = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  class: Schema.String,
  amount: Schema.Finite,
  basis: Schema.String,
});

export const BalanceSheet = Schema.Struct({
  left: Schema.Struct({
    currentAssets: Schema.Finite,
    fixedAssets: Schema.Finite,
    debtExcess: Schema.Finite,
  }),
  right: Schema.Struct({
    currentLiabilities: Schema.Finite,
    fixedLiabilities: Schema.Finite,
    netAssets: Schema.Finite,
  }),
  accounts: Schema.Array(AccountBalance),
});

export const Settings = Schema.Struct({
  accounts: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
  categories: Schema.Array(Schema.Struct({ id: Schema.String, label: Schema.String })),
});

const Transaction = Schema.Struct({
  id: Schema.Int,
  accountId: Schema.String,
  date: Schema.String,
  amount: Schema.Finite,
  description: Schema.String,
  memo: Schema.NullOr(Schema.String),
  category: Schema.String,
  label: Schema.NullOr(Schema.String),
});

export const TransactionPage = Schema.Struct({
  transactions: Schema.Array(Transaction),
  next: Schema.NullOr(Schema.String),
});

export type MoneySearchValue = typeof MoneySearch.Type;

export type TransactionValue = typeof Transaction.Type;

export type AccountBalanceValue = typeof AccountBalance.Type;

export type FlowNodeValue = typeof FlowNode.Type;

export type PeriodInputValue = typeof PeriodInput.Type;

export type PeriodValue = typeof Period.Type;

export type MoneyFlowValue = typeof MoneyFlow.Type;

export type MonthTotalValue = typeof MonthTotal.Type;

export type BalanceSheetValue = typeof BalanceSheet.Type;

export type SettingsValue = typeof Settings.Type;

export type TransactionPageValue = typeof TransactionPage.Type;

export type OverviewValue = Readonly<{
  period: PeriodValue;
  asOf: string;
  flow: MoneyFlowValue;
  months: readonly MonthTotalValue[];
  sheet: BalanceSheetValue;
  settings: SettingsValue;
}>;
