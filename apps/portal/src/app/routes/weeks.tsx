import { createFileRoute } from "@tanstack/react-router";
import { Schema } from "effect";

import { WeeksSearch } from "#/entities/watashi/index.ts";
import { WeeksPage, loadWeeksPage } from "#/pages/weeks/index.ts";

export const Route = createFileRoute("/weeks")({
  validateSearch: Schema.toStandardSchemaV1(WeeksSearch),
  loader: ({ context }) => loadWeeksPage(context.queryClient),
  component: WeeksPage,
});
