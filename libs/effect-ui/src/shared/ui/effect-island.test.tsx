import { UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { assert, it } from "@effect/vitest";
import { Schema } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { Button } from "./button.ts";
import { EffectIsland } from "./effect-island.tsx";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const LabelMessage = UiSchema.TaggedEnum({ ClickedLabel: {} });

const Label = Html.component({
  name: "Label",
  model: Schema.Struct({ clicks: Schema.Number }),
  message: LabelMessage,
}).make({
  init: () => ({ clicks: 0 }),
  update: { ClickedLabel: ($) => $.evolve({ clicks: (clicks) => clicks + 1 }) },
  view: (h, model) =>
    Button(h, { variant: "outline", onPress: LabelMessage.ClickedLabel() }).children(
      `pressed ${model.clicks}`,
    ),
});

const mountLabel = (container: HTMLElement) => BrowserHost.mount(Label, {}, container);

const settle = (): Promise<void> => act(() => new Promise((resolve) => setTimeout(resolve, 50)));

it("draws the Effect UI component, updates it on a press and removes it on unmount", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  await act(() => {
    root.render(<EffectIsland mount={mountLabel} />);
  });
  await settle();
  const button = host.querySelector("button");
  assert.strictEqual(button?.textContent, "pressed 0");
  assert.include(button?.className ?? "", "border");
  await act(() => {
    button?.click();
  });
  await settle();
  assert.strictEqual(host.querySelector("button")?.textContent, "pressed 1");
  await act(() => {
    root.unmount();
  });
  await settle();
  assert.strictEqual(host.querySelector("button"), null);
});
