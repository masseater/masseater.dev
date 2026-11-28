import { HtmlLocator, HtmlScene } from "@effect/ui/html/testing";
import { Story } from "@effect/ui/testing";
import { assert, it } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";

import { PasskeyPanelMessage } from "./passkey-panel-message.ts";
import { PasskeyPanelNoDeps } from "./passkey-panel.ts";
import { StartPasskey } from "./start-passkey.ts";

const PROPS = {
  kind: "sign-in",
  title: "watashi",
  label: "パスキーでログイン",
  done: "ログインしました",
  failed: "ログインできませんでした",
} as const;

const START = HtmlLocator.role("button", { name: PROPS.label });

it.effect("starts the flow of its kind and shows the result", () =>
  Effect.gen(function* body() {
    const story = yield* Story.make(PasskeyPanelNoDeps, PROPS);
    story.send(PasskeyPanelMessage.ClickedStart()).expectExact(StartPasskey);
    assert.strictEqual(story.model.status, "pending");
    assert.deepStrictEqual(
      pipe(
        story.pending,
        Arr.map(({ command }) => command.args),
      ),
      [{ kind: "sign-in" }],
    );
    story.resolve(StartPasskey, PasskeyPanelMessage.SucceededStartPasskey());
    assert.strictEqual(story.model.status, "success");
  }),
);

it.effect("shows the failure message and keeps the button usable", () =>
  Effect.gen(function* body() {
    const scene = yield* HtmlScene.make(PasskeyPanelNoDeps, PROPS);
    scene
      .click(START)
      .expectExact(StartPasskey)
      .expect(START)
      .toBeDisabled()
      .resolve(StartPasskey, PasskeyPanelMessage.FailedStartPasskey())
      .expect(HtmlLocator.role("alert"))
      .toHaveText(PROPS.failed)
      .expect(START)
      .toBeDisabled(false);
  }),
);
