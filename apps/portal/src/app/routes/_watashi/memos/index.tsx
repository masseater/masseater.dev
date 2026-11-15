import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { MemosSearch } from "#/entities/watashi";
import { MemosPage, loadMemosPage } from "#/pages/memos";

export const Route = createFileRoute("/_watashi/memos/")({
  validateSearch: Schema.toStandardSchemaV1(MemosSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadMemosPage({ queryClient: context.queryClient, search: deps }),
  component: MemosPage,
});
