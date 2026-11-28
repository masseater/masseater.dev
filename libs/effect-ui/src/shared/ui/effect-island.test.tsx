import { UiSchema } from "@effect/ui";
import { BrowserHost, Html } from "@effect/ui/html";
import { assert, it } from "@effect/vitest";
import { Effect, Number as Num, Option, Schema, String as Str, pipe } from "effect";
import type { Layer } from "effect";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { Button } from "./button.ts";
import { EffectIsland } from "./effect-island.tsx";

Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true);

const LabelMessage = UiSchema.TaggedEnum({ ClickedLabel: {} });

const NO_CLICKS = 0;

const Label = Html.component({
  name: "Label",
  model: Schema.Struct({ clicks: Schema.Finite }),
  message: LabelMessage,
}).make({
  init: () => ({ clicks: NO_CLICKS }),
  update: { ClickedLabel: (step) => step.evolve({ clicks: Num.increment }) },
  view: (html, model) =>
    Button({
      html,
      variant: "outline",
      onPress: LabelMessage.ClickedLabel(),
    }).children(`pressed ${model.clicks}`),
});

const mountLabel = (container: HTMLElement): Layer.Layer<never> =>
  BrowserHost.mount(Label, {}, container);

const SETTLE = "50 millis";

const buttonOf = (host: HTMLElement): Option.Option<HTMLButtonElement> =>
  Option.fromNullishOr(host.querySelector("button"));

const textOf = (host: HTMLElement): Option.Option<string | null> =>
  pipe(
    buttonOf(host),
    Option.map(({ textContent }) => textContent),
  );

const render = (action: () => void): Effect.Effect<void> =>
  Effect.sync(() => {
    act(action);
  });

const press = (host: HTMLElement): Effect.Effect<void> =>
  render(() => {
    Option.map(buttonOf(host), (button) => {
      button.click();
    });
  });

const settled = (check: () => void): Effect.Effect<void> =>
  Effect.sleep(SETTLE).pipe(Effect.andThen(Effect.sync(check)));

const expectLabel = (host: HTMLElement, text: string): Effect.Effect<void> =>
  settled(() => {
    assert.deepStrictEqual(textOf(host), Option.some(text));
    assert.isTrue(
      Option.exists(buttonOf(host), ({ className }) => Str.includes("border")(className)),
    );
  });

const expectGone = (host: HTMLElement): Effect.Effect<void> =>
  settled(() => {
    assert.isTrue(Option.isNone(buttonOf(host)));
  });

it.live("draws the Effect UI component, updates it on a press and removes it on unmount", () =>
  Effect.gen(function* body() {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    yield* render(() => {
      root.render(<EffectIsland mount={mountLabel} />);
    });
    yield* expectLabel(host, "pressed 0");
    yield* press(host);
    yield* expectLabel(host, "pressed 1");
    yield* render(() => {
      root.unmount();
    });
    yield* expectGone(host);
  }),
);
