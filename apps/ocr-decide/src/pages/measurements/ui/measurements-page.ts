import { Component } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Schema } from "effect";
import { AsyncResult } from "effect/reactivity";

import { GetSummary } from "#/pages/measurements/api/get-summary.ts";
import { COPY } from "#/pages/measurements/model/copy.ts";
import { SummaryTables } from "#/pages/measurements/ui/summary-tables.ts";
import { AppRoute } from "#/shared/config/index.ts";
import { PageLink } from "#/shared/ui/page-link.ts";

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const MeasurementsPageNoDeps = Html.component({
  name: "MeasurementsPage",
  model: Schema.Struct({}),
  message: Schema.Never,
  queries: { summary: { query: GetSummary, args: () => ({}) } },
}).make({
  init: () => ({}),
  update: (step) => step.model,
  view: (html) => {
    const tables = AsyncResult.match(html.queries.summary, {
      onInitial: () => [],
      onFailure: () => [],
      onSuccess: ({ value: summary }) => SummaryTables({ html, summary }),
    });
    return html.main
      .class("vt-match mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 md:px-8")
      .children(
        html.h1.class("text-2xl font-bold").children(COPY.title),
        tables,
        PageLink({ html, route: AppRoute.Extract() }).children(COPY.demo),
      );
  },
});

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const MeasurementsPage = MeasurementsPageNoDeps.pipe(Component.provide(GetSummary.layer));
