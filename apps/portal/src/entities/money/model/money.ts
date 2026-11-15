import { Schema } from "effect";

const Month = Schema.String.check(Schema.isPattern(/^\d{4}-(?:0[1-9]|1[0-2])$/u));

const MoneySearch = Schema.Struct({
  from: Schema.optionalKey(Month),
  to: Schema.optionalKey(Month),
  cursor: Schema.optionalKey(Schema.String),
});

const PeriodInput = Schema.Struct({
  from: Schema.optionalKey(Month),
  to: Schema.optionalKey(Month),
});

const Period = Schema.Struct({ from: Month, to: Month });

const TransactionsInput = Schema.Struct({
  from: Month,
  to: Month,
  cursor: Schema.optionalKey(Schema.String),
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

const MoneyFlow = Schema.Struct({
  nodes: Schema.Array(FlowNode),
  links: Schema.Array(FlowLink),
  income: Schema.Finite,
  expense: Schema.Finite,
});

const MonthTotal = Schema.Struct({
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

const BalanceSheet = Schema.Struct({
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

const Settings = Schema.Struct({
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

const TransactionPage = Schema.Struct({
  transactions: Schema.Array(Transaction),
  next: Schema.NullOr(Schema.String),
});

type MoneySearchValue = typeof MoneySearch.Type;

type TransactionValue = typeof Transaction.Type;

type AccountBalanceValue = typeof AccountBalance.Type;

type FlowNodeValue = typeof FlowNode.Type;

type PeriodInputValue = typeof PeriodInput.Type;

type PeriodValue = typeof Period.Type;

type MoneyFlowValue = typeof MoneyFlow.Type;

type MonthTotalValue = typeof MonthTotal.Type;

type BalanceSheetValue = typeof BalanceSheet.Type;

type SettingsValue = typeof Settings.Type;

type TransactionPageValue = typeof TransactionPage.Type;

type OverviewValue = Readonly<{
  period: PeriodValue;
  asOf: string;
  flow: MoneyFlowValue;
  months: readonly MonthTotalValue[];
  sheet: BalanceSheetValue;
  settings: SettingsValue;
}>;

export {
  BalanceSheet,
  MoneyFlow,
  MoneySearch,
  MonthTotal,
  PeriodInput,
  Settings,
  TransactionPage,
  TransactionsInput,
};
export type {
  AccountBalanceValue,
  BalanceSheetValue,
  FlowNodeValue,
  MoneyFlowValue,
  MoneySearchValue,
  MonthTotalValue,
  OverviewValue,
  PeriodInputValue,
  PeriodValue,
  SettingsValue,
  TransactionPageValue,
  TransactionValue,
};
