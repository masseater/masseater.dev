import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { RecordsSearch } from "#/entities/watashi/index.ts";
import { RecordsPage, loadRecordsPage } from "#/pages/records/index.ts";

export const Route = createFileRoute("/records")({
  validateSearch: Schema.toStandardSchemaV1(RecordsSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    loadRecordsPage({ queryClient: context.queryClient, search: deps }),
  component: RecordsPage,
});
