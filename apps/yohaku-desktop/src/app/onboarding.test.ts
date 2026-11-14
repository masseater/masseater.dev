import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { IDEA, READY, firstRun, ideaHintPending } from "#/app/__tests__/fake-yohaku.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { body, main, settled } from "#/app/__tests__/screen.ts";

const PAUSED = { timeout: 5000 };
const MISSING = { installed: false, loggedIn: false };
const LOGGED_OUT = { installed: true, loggedIn: false };
const GUIDE = "https://code.claude.com/docs/ja/quickstart";

const claude = page.getByRole("region", { name: "Claude Code" });
const setting = page.getByRole("region", { name: "作品の設定" });

describe("onboarding", () => {
  it.live("puts the setting in and starts writing", () =>
    Effect.gen(function* test() {
      yield* mount(firstRun(READY).yohaku);
      yield* Effect.promise(() =>
        expect.element(claude.getByText("ログイン済み"), PAUSED).toBeVisible(),
      );
      yield* Effect.promise(() =>
        userEvent.fill(setting.getByRole("textbox", { name: "URL か文章" }), "ヤチヨの設定メモ"),
      );
      yield* Effect.promise(() =>
        userEvent.click(setting.getByRole("button", { name: "取り込む" })),
      );
      yield* Effect.promise(() =>
        expect
          .element(page.getByRole("list", { name: "ヤチヨの設定メモ" }).getByText("ヤチヨ"), PAUSED)
          .toBeVisible(),
      );
      yield* settled;
      yield* Effect.promise(() => expect(main).toMatchScreenshot("onboarding"));
      yield* Effect.promise(() =>
        userEvent.click(page.getByRole("button", { name: "書き始める" })),
      );
      yield* Effect.promise(() => expect.element(body, PAUSED).toBeVisible());
    }),
  );

  it.live("sends a writer without Claude Code to the install guide", () =>
    Effect.gen(function* test() {
      const fake = firstRun(MISSING);
      yield* mount(fake.yohaku);
      yield* Effect.promise(() =>
        userEvent.click(claude.getByRole("button", { name: "Claude Code を入れる" })),
      );
      expect(fake.calls.opened).toStrictEqual([GUIDE]);
    }),
  );

  it.live("shows the login command when Claude Code is signed out", () =>
    Effect.gen(function* test() {
      yield* mount(firstRun(LOGGED_OUT).yohaku);
      yield* Effect.promise(() =>
        expect.element(claude.getByText("claude auth login"), PAUSED).toBeVisible(),
      );
    }),
  );
});

describe("hints", () => {
  it.live("points at the first idea once", () =>
    Effect.gen(function* test() {
      yield* mount(ideaHintPending().yohaku);
      yield* Effect.promise(() => userEvent.click(body));
      yield* Effect.promise(() => userEvent.keyboard(`${IDEA}ヤチヨはたまにかぐやの姿で遊ぶ`));
      const beacon = page.getByRole("button", { name: "ネタ" });
      yield* Effect.promise(() => expect.element(beacon, PAUSED).toBeVisible());
      yield* Effect.promise(() => userEvent.click(beacon));
      yield* Effect.promise(() => userEvent.click(page.getByRole("button", { name: "わかった" })));
      yield* Effect.promise(() => expect.element(beacon).not.toBeInTheDocument());
    }),
  );
});
