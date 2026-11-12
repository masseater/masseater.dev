import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { fakeYohaku } from "#/app/__tests__/fake-yohaku.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { main, settled } from "#/app/__tests__/screen.ts";

const openManuscripts = Effect.promise(() =>
  userEvent.click(
    page.getByRole("navigation", { name: "画面" }).getByRole("button", { name: "原稿" }),
  ),
);

describe("sync", () => {
  it.live("signs in from the manuscript list and shows when it last synced", () =>
    Effect.gen(function* test() {
      yield* mount(fakeYohaku([]).yohaku);
      yield* openManuscripts;
      yield* Effect.promise(() =>
        userEvent.click(page.getByRole("button", { name: "同期を始める" })),
      );
      yield* Effect.promise(() => expect.element(page.getByText(/^同期済み/u)).toBeVisible());
      yield* settled;
      yield* Effect.promise(() => expect(main).toMatchScreenshot("synced"));
    }),
  );
});
