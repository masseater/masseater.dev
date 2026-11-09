import { describe, expect, it } from "@effect/vitest";
import { Array, Effect, Option, pipe } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { fakeEngine } from "#/app/__tests__/fake-engine.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { output, source } from "#/app/__tests__/screen.ts";

describe("editing", () => {
  it.live("swaps the languages and moves the translation into the source", () =>
    Effect.gen(function* test() {
      const fake = fakeEngine();
      yield* mount(fake.engine);
      yield* Effect.promise(() => userEvent.fill(source, "Hello"));
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("JA: Hello"));
      yield* Effect.promise(() => page.getByRole("button", { name: "言語を入れ替える" }).click());
      yield* Effect.promise(() => expect.element(source).toHaveValue("JA: Hello"));
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("EN: JA: Hello"));
      const last = Array.last(fake.requests);
      expect(
        pipe(
          last,
          Option.map((request) => request.source),
        ),
      ).toStrictEqual(Option.some(Option.some("ja")));
      expect(
        pipe(
          last,
          Option.map((request) => request.target),
        ),
      ).toStrictEqual(Option.some("en"));
    }),
  );

  it.live("asks for a polite style in Japanese", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      yield* Effect.promise(() => userEvent.fill(source, "Thanks"));
      yield* Effect.promise(() => page.getByRole("radio", { name: "です・ます" }).click());
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("JA polite: Thanks"));
    }),
  );

  it.live("clears the source and the translation", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      yield* Effect.promise(() => userEvent.fill(source, "Hello"));
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("JA: Hello"));
      yield* Effect.promise(() => page.getByRole("button", { name: "消去" }).click());
      yield* Effect.promise(() => expect.element(source).toHaveValue(""));
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("翻訳"));
    }),
  );
});

describe("failing", () => {
  it.live("shows why a translation failed", () =>
    Effect.gen(function* test() {
      yield* mount(fakeEngine().engine);
      yield* Effect.promise(() => userEvent.fill(source, "壊れた文"));
      yield* Effect.promise(() =>
        expect.element(output).toHaveTextContent("翻訳エンジンが起動しません"),
      );
    }),
  );
});
