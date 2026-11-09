import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { page, userEvent } from "vite-plus/test/browser";
import type { Locator } from "vite-plus/test/browser";

import { fakeEngine } from "#/app/__tests__/fake-engine.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { main, output, source } from "#/app/__tests__/screen.ts";

describe("choosing a language", () => {
  it.live("chooses a target language from the picker", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      yield* Effect.promise(() => page.getByRole("button", { name: "翻訳先の言語を選ぶ" }).click());
      yield* Effect.promise(() => expect(main).toMatchScreenshot("picker"));
      yield* Effect.promise(() =>
        userEvent.fill(page.getByRole("textbox", { name: "言語を検索" }), "ドイツ"),
      );
      yield* Effect.promise(() => page.getByRole("button", { name: "ドイツ語" }).click());
      yield* Effect.promise(() => userEvent.fill(source, "Hello"));
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("DE: Hello"));
      yield* Effect.promise(() =>
        expect
          .element(page.getByRole("button", { name: "ドイツ語" }))
          .toHaveAttribute("aria-pressed", "true"),
      );
    }),
  );
});

const ONCE = 1;

const tab = (name: string): Locator => page.getByRole("button", { name, exact: true });

describe("choosing the same language on both sides", () => {
  it.live("moves the target away from the chosen source", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      yield* Effect.promise(() => tab("日本語").first().click());
      yield* Effect.promise(() =>
        expect.element(tab("英語").last()).toHaveAttribute("aria-pressed", "true"),
      );
    }),
  );

  it.live("swaps the languages when the target becomes the source", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      yield* Effect.promise(() => tab("英語").first().click());
      yield* Effect.promise(() => tab("英語").last().click());
      yield* Effect.promise(() =>
        expect.element(tab("日本語").first()).toHaveAttribute("aria-pressed", "true"),
      );
      yield* Effect.promise(() =>
        expect.element(tab("英語").last()).toHaveAttribute("aria-pressed", "true"),
      );
    }),
  );
});

describe("recent languages", () => {
  it.live("puts a newly chosen language first and drops the oldest", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      yield* Effect.promise(() => page.getByRole("button", { name: "翻訳先の言語を選ぶ" }).click());
      yield* Effect.promise(() => page.getByRole("button", { name: "韓国語" }).click());
      expect(tab("韓国語").elements()).toHaveLength(ONCE);
      expect(tab("簡体中国語").elements()).toHaveLength(ONCE);
    }),
  );
});
