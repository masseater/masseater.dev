import { describe, expect, it } from "@effect/vitest";
import { Array, Effect, Option } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { fakeEngine } from "#/app/__tests__/fake-engine.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { main, output, source } from "#/app/__tests__/screen.ts";

describe("translating", () => {
  it.live("shows two empty panes", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("翻訳"));
      yield* Effect.promise(() => expect.element(page.getByText("0 / 5,000")).toBeVisible());
      yield* Effect.promise(() => expect(main).toMatchScreenshot("empty"));
    }),
  );

  it.live("translates detected Japanese into English once typing pauses", () =>
    Effect.gen(function* test() {
      const fake = fakeEngine();
      yield* mount(fake.engine);
      yield* Effect.promise(() => userEvent.fill(source, "会議は来週の月曜日です。"));
      yield* Effect.promise(() =>
        expect.element(output).toHaveTextContent("EN: 会議は来週の月曜日です。"),
      );
      yield* Effect.promise(() =>
        expect
          .element(page.getByRole("button", { name: "日本語 - 検出" }))
          .toHaveAttribute("aria-pressed", "true"),
      );
      expect(Array.last(fake.requests)).toStrictEqual(
        Option.some({
          text: "会議は来週の月曜日です。",
          source: Option.none(),
          target: "en",
          form: Option.none(),
        }),
      );
      yield* Effect.promise(() => expect(main).toMatchScreenshot("translated"));
    }),
  );

  it.live("follows the dark color scheme", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      document.documentElement.classList.add("dark");
      yield* Effect.promise(() => userEvent.fill(source, "Good morning"));
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("JA: Good morning"));
      yield* Effect.promise(() => expect(main).toMatchScreenshot("translated-dark"));
    }),
  );
});
