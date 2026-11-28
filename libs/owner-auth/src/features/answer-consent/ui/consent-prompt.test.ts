import { HtmlLocator, HtmlScene } from "@effect/ui/html/testing";
import { assert, it } from "@effect/vitest";
import { Effect } from "effect";

import { AnswerConsent, ConsentPromptMessage, ConsentPromptNoDeps } from "./consent-prompt.ts";

const PROPS = {
  scope: "記憶の読み書きを許可します",
  clientId: "kXwPqLmNoRsTuVyZ",
  redirectUri: "https://claude.ai/api/mcp/auth_callback",
  requestedScope: "openid profile",
} as const;

const ALLOW = HtmlLocator.role("button", { name: "許可する" });

const DENY = HtmlLocator.role("button", { name: "拒否する" });

it.effect("keeps allow disabled until the client name loads, then answers", () =>
  Effect.gen(function* () {
    const s = yield* HtmlScene.make(ConsentPromptNoDeps, PROPS);
    s.expect(ALLOW).toBeDisabled();
    s.loaded("client", "Claude")
      .expect(HtmlLocator.role("heading"))
      .toHaveText("Claude")
      .expect(ALLOW)
      .toBeDisabled(false)
      .click(ALLOW)
      .expectExact(AnswerConsent)
      .expect(DENY)
      .toBeDisabled();
    assert.deepStrictEqual(s.pending[0]?.command.args, { accept: true });
    s.resolve(AnswerConsent, ConsentPromptMessage.SucceededAnswerConsent());
  }),
);

it.effect("denies, and shows the failure when the answer is refused", () =>
  Effect.gen(function* () {
    const s = yield* HtmlScene.make(ConsentPromptNoDeps, PROPS);
    s.loaded("client", "Claude").click(DENY).expectExact(AnswerConsent);
    assert.deepStrictEqual(s.pending[0]?.command.args, { accept: false });
    s.resolve(AnswerConsent, ConsentPromptMessage.FailedAnswerConsent())
      .expect(HtmlLocator.role("alert"))
      .toHaveText("許可できませんでした");
  }),
);
