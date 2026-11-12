import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { fakeYohaku } from "#/app/__tests__/fake-yohaku.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { main, settled } from "#/app/__tests__/screen.ts";

const WATCHING_MEMO = {
  id: "watching",
  label: "第 1 話の視聴メモ",
  origin: "mcp" as const,
  client: "Claude Code",
  facts: 14,
  createdAt: 0,
};

const sourcesList = page.getByRole("list", { name: "取り込んだ資料" });

const openSources = Effect.promise(() =>
  userEvent.click(
    page.getByRole("navigation", { name: "画面" }).getByRole("button", { name: "資料" }),
  ),
);

describe("sources", () => {
  it.live("lists sources with who added them", () =>
    Effect.gen(function* test() {
      yield* mount(fakeYohaku([WATCHING_MEMO]).yohaku);
      yield* openSources;
      yield* Effect.promise(() =>
        expect.element(sourcesList.getByText("Claude Code")).toBeVisible(),
      );
      yield* settled;
      yield* Effect.promise(() => expect(main).toMatchScreenshot("sources"));
    }),
  );

  it.live("ingests a URL and reverts a source", () =>
    Effect.gen(function* test() {
      yield* mount(fakeYohaku([WATCHING_MEMO]).yohaku);
      yield* openSources;
      yield* Effect.promise(() =>
        userEvent.fill(
          page.getByRole("textbox", { name: "URL か文章" }),
          "https://dic.pixiv.net/a/ヤチヨ",
        ),
      );
      yield* Effect.promise(() => userEvent.click(page.getByRole("button", { name: "取り込む" })));
      yield* Effect.promise(() =>
        expect.element(sourcesList.getByText("https://dic.pixiv.net/a/ヤチヨ")).toBeVisible(),
      );
      const row = sourcesList.getByRole("listitem").filter({ hasText: WATCHING_MEMO.label });
      yield* Effect.promise(() => userEvent.click(row.getByRole("button", { name: "戻す" })));
      yield* Effect.promise(() =>
        expect.element(sourcesList.getByText(WATCHING_MEMO.label)).not.toBeInTheDocument(),
      );
    }),
  );
});
