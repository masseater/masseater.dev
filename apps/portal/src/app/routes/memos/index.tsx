import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { MemosSearch } from "#/entities/watashi/index.ts";
import { MemosPage, loadMemosPage } from "#/pages/memos/index.ts";

export const Route = createFileRoute("/memos/")({
  validateSearch: Schema.toStandardSchemaV1(MemosSearch),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => loadMemosPage({ queryClient: context.queryClient, search: deps }),
  component: MemosPage,
});
