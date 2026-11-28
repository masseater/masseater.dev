import { HtmlLocator, HtmlScene } from "@effect/ui/html/testing";
import { Story } from "@effect/ui/testing";
import { assert, it } from "@effect/vitest";
import { Effect } from "effect";

import { PasskeyPanelMessage, PasskeyPanelNoDeps, StartPasskey } from "./passkey-panel.ts";

const PROPS = {
  kind: "sign-in",
  title: "watashi",
  label: "パスキーでログイン",
  done: "ログインしました",
  failed: "ログインできませんでした",
} as const;

it.effect("starts the flow of its kind and shows the result", () =>
  Effect.gen(function* () {
    const s = yield* Story.make(PasskeyPanelNoDeps, PROPS);
    s.send(PasskeyPanelMessage.ClickedStart()).expectExact(StartPasskey);
    assert.strictEqual(s.model.status, "pending");
    assert.deepStrictEqual(s.pending[0]?.command.args, { kind: "sign-in" });
    s.resolve(StartPasskey, PasskeyPanelMessage.SucceededStartPasskey());
    assert.strictEqual(s.model.status, "success");
  }),
);

it.effect("shows the failure message and keeps the button usable", () =>
  Effect.gen(function* () {
    const s = yield* HtmlScene.make(PasskeyPanelNoDeps, PROPS);
    s.click(HtmlLocator.role("button", { name: PROPS.label }))
      .expectExact(StartPasskey)
      .expect(HtmlLocator.role("button", { name: PROPS.label }))
      .toBeDisabled()
      .resolve(StartPasskey, PasskeyPanelMessage.FailedStartPasskey())
      .expect(HtmlLocator.role("alert"))
      .toHaveText(PROPS.failed)
      .expect(HtmlLocator.role("button", { name: PROPS.label }))
      .toBeDisabled(false);
  }),
);
