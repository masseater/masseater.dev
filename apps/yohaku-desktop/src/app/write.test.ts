import { describe, expect, it } from "@effect/vitest";
import { Array, Effect, String, pipe } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { DRAFT, EMOTION, REWRITE, fakeYohaku } from "#/app/__tests__/fake-yohaku.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { body, main, settled } from "#/app/__tests__/screen.ts";

const OPENING = "鏡の中で、かぐやの顔が笑っていた。";
const PROSE = `${OPENING}${EMOTION}`;
const MEMO = "彩葉に見られる　ヤチヨ焦る　ふりは続ける？";
const PAUSED = { timeout: 5000 };
const STALLED = { timeout: 15_000 };
const DRAFTED = pipe(DRAFT, Array.join(String.empty));
const REWRITTEN = pipe(REWRITE, Array.join(String.empty));

const written = (text: string): Effect.Effect<void> =>
  Effect.promise(() => userEvent.click(body)).pipe(
    Effect.andThen(Effect.promise(() => userEvent.keyboard(text))),
  );

const remark = page.getByRole("complementary", { name: "感情の説明" });
const draft = page.getByRole("region", { name: "下書き" });

const remarked = Effect.promise(() => expect.element(remark, PAUSED).toBeVisible());

const scopes = { remark, draft } as const;

const pressed = (scope: keyof typeof scopes, name: string): Effect.Effect<void> =>
  Effect.promise(() => userEvent.click(scopes[scope].getByRole("button", { name })));

const startsBlank = Effect.gen(function* startsBlank() {
  yield* mount(fakeYohaku([]).yohaku);
  yield* Effect.promise(() => expect.element(body).toHaveFocus());
  yield* settled;
  yield* Effect.promise(() => expect(main).toMatchScreenshot("blank"));
});

const annotates = Effect.gen(function* annotates() {
  yield* mount(fakeYohaku([]).yohaku);
  yield* written(`${PROSE}{Enter}${MEMO}`);
  yield* remarked;
  yield* settled;
  yield* Effect.promise(() => expect(main).toMatchScreenshot("annotated"));
});

const keepsRemark = Effect.gen(function* keepsRemark() {
  const fake = fakeYohaku([]);
  yield* mount(fake.yohaku);
  yield* written(PROSE);
  yield* remarked;
  yield* pressed("remark", "残す");
  yield* Effect.promise(() => expect.element(remark).not.toBeInTheDocument());
  expect(fake.calls.dismissed).toStrictEqual(["emotion_explained"]);
});

const rewritesRemark = Effect.gen(function* rewritesRemark() {
  const fake = fakeYohaku([]);
  yield* mount(fake.yohaku);
  yield* written(PROSE);
  yield* remarked;
  yield* pressed("remark", "書き直させる");
  yield* Effect.promise(() => expect.element(remark.getByText(REWRITTEN)).toBeVisible());
  yield* pressed("remark", "置き換える");
  yield* Effect.promise(() =>
    expect.element(body.getByText(`${OPENING}${REWRITTEN}`)).toBeVisible(),
  );
  expect(fake.calls.reactions).toStrictEqual(["remark-rewritten"]);
});

const draftsMemo = Effect.gen(function* draftsMemo() {
  const fake = fakeYohaku([]);
  yield* mount(fake.yohaku);
  yield* written(`${PROSE}{Enter}${MEMO}`);
  yield* Effect.promise(() => expect.element(draft.getByText(DRAFTED), STALLED).toBeVisible());
  yield* settled;
  yield* Effect.promise(() => expect(main).toMatchScreenshot("drafted"));
  yield* pressed("draft", "本文にする");
  yield* Effect.promise(() => expect.element(body.getByText(DRAFTED)).toBeVisible());
  yield* Effect.promise(() => expect.element(body.getByText(MEMO)).not.toBeInTheDocument());
  expect(fake.calls.reactions).toStrictEqual(["draft-accepted"]);
});

describe("writing", () => {
  it.live("starts on a blank page with the cursor in the body", () => startsBlank);
  it.live("labels memos and points at explained feelings once typing pauses", () => annotates);
  it.live("keeps a remark the writer wants to keep", () => keepsRemark);
  it.live("replaces the marked words with a rewrite", () => rewritesRemark);
  it.live("drafts prose from a memo when the writer stops at it", () => draftsMemo);
});
