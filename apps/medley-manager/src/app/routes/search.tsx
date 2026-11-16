import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { SearchPage, loadSearchPage } from "#/pages/search/index.ts";
import { TextSearch } from "#/shared/lib/text-search.ts";

export const Route = createFileRoute("/search")({
  validateSearch: Schema.toStandardSchemaV1(TextSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadSearchPage({ queryClient: context.queryClient, filter: deps }),
  component: SearchPage,
});
