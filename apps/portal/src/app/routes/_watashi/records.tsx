import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { RecordsSearch } from "#/entities/watashi";
import { RecordsPage, loadRecordsPage } from "#/pages/records";

export const Route = createFileRoute("/_watashi/records")({
  validateSearch: Schema.toStandardSchemaV1(RecordsSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    loadRecordsPage({ queryClient: context.queryClient, search: deps }),
  component: RecordsPage,
});
