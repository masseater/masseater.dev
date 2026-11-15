import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { RecordsSearch } from "#/entities/watashi";
import { SearchPage, loadSearchPage } from "#/pages/search";

export const Route = createFileRoute("/search")({
  validateSearch: Schema.toStandardSchemaV1(RecordsSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    loadSearchPage({ queryClient: context.queryClient, keyword: deps.keyword ?? "" }),
  component: SearchPage,
});
