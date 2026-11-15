import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { updateReady } from "./fake-setups.test.support.ts";
import { DOWNLOADED } from "./fake-update.test.support.ts";
import { fakeYohaku } from "./fake-yohaku.test.support.ts";
import { mount } from "./mount.test.support.tsx";
import { settled } from "./screen.test.support.ts";

const PAUSED = { timeout: 5000 };
const VERSION = "0.2.0";

const notice = page.getByRole("complementary", { name: "更新" });

describe("update", () => {
  it.live("offers the new release and shows the download", () =>
    Effect.gen(function* test() {
      yield* mount(updateReady({ version: VERSION }).yohaku);
      yield* Effect.promise(() => expect.element(notice.getByText(VERSION), PAUSED).toBeVisible());
      yield* settled;
      yield* Effect.promise(() => expect(notice).toMatchScreenshot("update"));
      yield* Effect.promise(() =>
        userEvent.click(notice.getByRole("button", { name: "更新して再起動" })),
      );
      yield* Effect.promise(() =>
        expect.element(notice.getByText(`更新中 ${DOWNLOADED.toString()}%`), PAUSED).toBeVisible(),
      );
    }),
  );

  it.live("opens the notes of the new release", () =>
    Effect.gen(function* test() {
      const { yohaku, calls } = updateReady({ version: VERSION });
      yield* mount(yohaku);
      yield* Effect.promise(() => userEvent.click(notice.getByRole("button", { name: VERSION })));
      expect(calls.opened).toStrictEqual([
        `https://github.com/masseater/masseater.dev/releases/tag/yohaku-v${VERSION}`,
      ]);
    }),
  );

  it.live("stays out of the way without a new release", () =>
    Effect.gen(function* test() {
      yield* mount(fakeYohaku([]).yohaku);
      yield* Effect.promise(() => expect.element(page.getByRole("main"), PAUSED).toBeVisible());
      yield* Effect.promise(() => expect.element(notice).not.toBeInTheDocument());
    }),
  );
});
