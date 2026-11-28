import { HtmlLocator, HtmlScene } from "@effect/ui/html/testing";
import { it } from "@effect/vitest";
import { SummarySchema } from "@ocr-decide/measurements/schema";
import summaryJson from "@ocr-decide/measurements/summary";
import { Effect, Schema } from "effect";

import { COPY } from "#/pages/measurements/model/copy.ts";

import { MeasurementsPageNoDeps } from "./measurements-page.ts";

it.effect("shows the title and fills the tables once the summary is loaded", () =>
  Effect.gen(function* body() {
    const summary = yield* Schema.decodeUnknownEffect(SummarySchema)(summaryJson);
    const scene = yield* HtmlScene.make(MeasurementsPageNoDeps, {});
    scene
      .expect(HtmlLocator.role("heading", { level: 1 }))
      .toHaveText(COPY.title)
      .loaded("summary", summary)
      .expect(HtmlLocator.role("table"))
      .toExist();
  }),
);
