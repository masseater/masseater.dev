import { describe, expect, it } from "@effect/vitest";
import { Effect, Option } from "effect";
import { page, userEvent } from "vite-plus/test/browser";
import type { Locator } from "vite-plus/test/browser";

import { fakeCommands } from "./fake-commands.test.support.ts";
import { mount } from "./mount.test.support.tsx";
import { HABIT, SONG_FILES } from "./songs.test.support.ts";

const act = (step: () => Promise<unknown>): Effect.Effect<unknown> => Effect.promise(step);

const visible = (locator: Readonly<Locator>): Effect.Effect<unknown> =>
  act(() => expect.element(locator).toBeVisible());

const importSongs = Effect.gen(function* steps() {
  yield* act(() => userEvent.fill(page.getByRole("textbox", { name: "スタイル名" }), "歌もの"));
  yield* act(() => userEvent.click(page.getByRole("button", { name: "スタイルを追加" })));
  yield* visible(page.getByRole("heading", { name: "曲を取り込む" }));
  yield* act(() => userEvent.upload(page.getByLabelText(/ここに置くか、選ぶ/u), [...SONG_FILES]));
  yield* visible(page.getByRole("link", { name: "坂道" }));
});

const keepUnderNewAim = Effect.gen(function* steps() {
  yield* act(() => userEvent.click(page.getByRole("button", { name: "守る" })));
  yield* act(() =>
    userEvent.fill(page.getByRole("textbox", { name: "新しい狙いの名前" }), "解決を遅らせる"),
  );
  yield* act(() => userEvent.click(page.getByRole("button", { name: "ルールにする" })));
});

const seeRuleUnderAim = Effect.gen(function* steps() {
  yield* act(() => userEvent.click(page.getByRole("link", { name: "癖", exact: true })));
  yield* act(() => userEvent.click(page.getByRole("link", { name: "和声" }).first()));
  yield* visible(page.getByRole("heading", { name: "解決を遅らせる" }));
  yield* visible(page.getByRole("link", { name: HABIT }));
  yield* visible(page.getByText("2 曲で 2 回"));
});

describe("fushi", () => {
  it.live("imports songs and shows their timeline", () =>
    Effect.gen(function* test() {
      fakeCommands();
      yield* mount;
      yield* importSongs;
      yield* act(() => userEvent.click(page.getByRole("link", { name: "夜明け" })));
      yield* visible(page.getByText("9 小節"));
      yield* visible(page.getByTitle("pad"));
    }),
  );

  it.live("keeps a habit as a rule under a new aim and saves it", () =>
    Effect.gen(function* test() {
      const disk = fakeCommands();
      yield* mount;
      yield* importSongs;
      yield* act(() => userEvent.click(page.getByRole("link", { name: "癖の候補を判定する" })));
      yield* visible(page.getByRole("heading", { name: HABIT }));
      yield* visible(page.getByText("2 / 2 曲"));
      yield* keepUnderNewAim;
      yield* seeRuleUnderAim;
      expect(Option.getOrElse(disk.saved(), () => "")).toContain("解決を遅らせる");
    }),
  );
});
