import { Component } from "@effect/ui";
import { Html } from "@effect/ui/html";
import { Array as Arr, Schema, pipe } from "effect";
import { AsyncResult } from "effect/reactivity";

import { GetJaBench } from "#/pages/ocr-engines/api/get-ja-bench.ts";
import { COPY } from "#/pages/ocr-engines/model/copy.ts";
import { tablesOf } from "#/pages/ocr-engines/model/tables.ts";
import { AppRoute } from "#/shared/config/index.ts";
import { PageLink } from "#/shared/ui/page-link.ts";
import { ValueTable } from "#/shared/ui/value-table.ts";

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const OcrEnginesPageNoDeps = Html.component({
  name: "OcrEnginesPage",
  model: Schema.Struct({}),
  message: Schema.Never,
  queries: { jaBench: { query: GetJaBench, args: () => ({}) } },
}).make({
  init: () => ({}),
  update: (step) => step.model,
  view: (html) => {
    const sections = AsyncResult.match(html.queries.jaBench, {
      onInitial: () => [],
      onFailure: () => [],
      onSuccess: ({ value: summary }) =>
        pipe(
          tablesOf(summary),
          Arr.map(({ id, title, columns }) =>
            ValueTable({
              html,
              id,
              title,
              corner: COPY.engine,
              rows: summary.runs,
              columns,
              rowKey: ({ engine }) => engine,
              rowLabel: ({ label }) => label,
            }),
          ),
        ),
    });
    return html.main
      .class("vt-match mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 md:px-8")
      .children(
        html.h1.class("text-2xl font-bold").children(COPY.title),
        html.p.class("text-sm leading-relaxed").children(COPY.lead),
        sections,
        PageLink({ html, route: AppRoute.Extract() }).children(COPY.back),
      );
  },
});

/** @stability experimental */
// oxlint-disable-next-line effecttsgo/missing-pipeable-signature -- Effect UI components are called as (html, options)
export const OcrEnginesPage = OcrEnginesPageNoDeps.pipe(Component.provide(GetJaBench.layer));
