import { HtmlLocator, HtmlScene } from "@effect/ui/html/testing";
import { it } from "@effect/vitest";
import { Effect, Option } from "effect";

import { DIRECT } from "#/entities/extraction/index.ts";
import { RunExtract } from "#/features/run-extract/api/run-extract.ts";
import { RunPanelMessage } from "#/features/run-extract/model/messages.ts";
import { COPY } from "#/shared/config/index.ts";

import { RunPanelNoDeps } from "./run-panel.ts";

const PROPS = {
  picture: Option.some({
    name: "invoice.png",
    url: "/samples/invoice.png",
    source: "/samples/invoice.png",
  }),
  way: DIRECT.key,
};

const RUN = HtmlLocator.role("button", { name: COPY.run });

const KEY = HtmlLocator.placeholder(COPY.apiKey);

const withKey = Effect.gen(function* withKey() {
  const scene = yield* HtmlScene.make(RunPanelNoDeps, PROPS);
  return scene.type(KEY, "sk-test");
});

it.effect("keeps the button disabled until a key is typed", () =>
  Effect.gen(function* body() {
    const scene = yield* HtmlScene.make(RunPanelNoDeps, PROPS);
    scene.expect(RUN).toBeDisabled().type(KEY, "sk-test").expect(RUN).toBeDisabled(false);
  }),
);

it.effect("runs the extraction with the typed key and shows the lines", () =>
  Effect.gen(function* body() {
    const scene = yield* withKey;
    scene
      .click(RUN)
      .expectExact(RunExtract)
      .resolve(
        RunExtract,
        RunPanelMessage.SucceededExtract({ lines: [{ label: "合計", value: "1,000" }] }),
      )
      .expect(HtmlLocator.role("table"))
      .toHaveText(/1,000/u);
  }),
);

it.effect("shows the reason when the extraction fails", () =>
  Effect.gen(function* body() {
    const scene = yield* withKey;
    scene
      .click(RUN)
      .expectExact(RunExtract)
      .resolve(RunExtract, RunPanelMessage.FailedExtract({ reason: "boom" }))
      .expect(HtmlLocator.role("alert"))
      .toHaveText("boom");
  }),
);
