import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { DRAFT, EMOTION, REWRITE, fakeYohaku } from "#/app/__tests__/fake-yohaku.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { body, main, settled } from "#/app/__tests__/screen.ts";

const PROSE = `鏡の中で、かぐやの顔が笑っていた。${EMOTION}`;
const MEMO = "彩葉に見られる　ヤチヨ焦る　ふりは続ける？";
const PAUSED = { timeout: 5000 };
const STALLED = { timeout: 15_000 };

const written = (text: string): Effect.Effect<void> =>
  Effect.promise(async () => {
    await userEvent.click(body);
    await userEvent.keyboard(text);
  });

const remark = page.getByRole("complementary", { name: "感情の説明" });

describe("writing", () => {
  it.live("starts on a blank page with the cursor in the body", () =>
    Effect.gen(function* test() {
      yield* mount(fakeYohaku().yohaku);
      yield* Effect.promise(() => expect.element(body).toHaveFocus());
      yield* settled;
      yield* Effect.promise(() => expect(main).toMatchScreenshot("blank"));
    }),
  );

  it.live("labels memos and points at explained feelings once typing pauses", () =>
    Effect.gen(function* test() {
      yield* mount(fakeYohaku().yohaku);
      yield* written(`${PROSE}{Enter}${MEMO}`);
      yield* Effect.promise(() => expect.element(remark).toBeVisible(PAUSED));
      yield* settled;
      yield* Effect.promise(() => expect(main).toMatchScreenshot("annotated"));
    }),
  );

  it.live("keeps a remark the writer wants to keep", () =>
    Effect.gen(function* test() {
      const fake = fakeYohaku();
      yield* mount(fake.yohaku);
      yield* written(PROSE);
      yield* Effect.promise(() => expect.element(remark).toBeVisible(PAUSED));
      yield* Effect.promise(() => userEvent.click(remark.getByRole("button", { name: "残す" })));
      yield* Effect.promise(() => expect.element(remark).not.toBeInTheDocument());
      expect(fake.calls.dismissed).toStrictEqual(["emotion_explained"]);
    }),
  );

  it.live("replaces the marked words with a rewrite", () =>
    Effect.gen(function* test() {
      const fake = fakeYohaku();
      yield* mount(fake.yohaku);
      yield* written(PROSE);
      yield* Effect.promise(() => expect.element(remark).toBeVisible(PAUSED));
      yield* Effect.promise(() =>
        userEvent.click(remark.getByRole("button", { name: "書き直させる" })),
      );
      yield* Effect.promise(() => expect.element(remark.getByText(REWRITE.join(""))).toBeVisible());
      yield* Effect.promise(() =>
        userEvent.click(remark.getByRole("button", { name: "置き換える" })),
      );
      yield* Effect.promise(() =>
        expect.element(body).toHaveTextContent(`鏡の中で、かぐやの顔が笑っていた。${REWRITE.join("")}`),
      );
      expect(fake.calls.reactions).toStrictEqual(["remark-rewritten"]);
    }),
  );

  it.live("drafts prose from a memo when the writer stops at it", () =>
    Effect.gen(function* test() {
      const fake = fakeYohaku();
      yield* mount(fake.yohaku);
      yield* written(`${PROSE}{Enter}${MEMO}`);
      const draft = page.getByRole("region", { name: "下書き" });
      yield* Effect.promise(() => expect.element(draft.getByText(DRAFT.join(""))).toBeVisible(STALLED));
      yield* settled;
      yield* Effect.promise(() => expect(main).toMatchScreenshot("drafted"));
      yield* Effect.promise(() => userEvent.click(draft.getByRole("button", { name: "本文にする" })));
      yield* Effect.promise(() => expect.element(body.getByText(DRAFT.join(""))).toBeVisible());
      yield* Effect.promise(() => expect.element(body.getByText(MEMO)).not.toBeInTheDocument());
      expect(fake.calls.reactions).toStrictEqual(["draft-accepted"]);
    }),
  );
});
