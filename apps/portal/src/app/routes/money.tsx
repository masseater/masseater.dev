import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { MoneySearch } from "#/entities/money/index.ts";
import { MoneyPage, loadMoneyPage } from "#/pages/money/index.ts";

export const Route = createFileRoute("/money")({
  validateSearch: Schema.toStandardSchemaV1(MoneySearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadMoneyPage({ queryClient: context.queryClient, search: deps }),
  component: MoneyPage,
});
