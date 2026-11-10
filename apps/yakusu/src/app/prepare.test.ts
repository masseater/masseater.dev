import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import { page, userEvent } from "vite-plus/test/browser";

import { fakeEngineWith } from "#/app/__tests__/fake-engine.ts";
import { mount } from "#/app/__tests__/mount.tsx";
import { main, output, source } from "#/app/__tests__/screen.ts";

const PROGRESS = { received: 123_456_789, total: 573_126_848 };

const FAILURE = "モデルを取得できません";

const FIRST = 1;

const retry = page.getByRole("button", { name: "再試行" });

describe("preparing", () => {
  it.live("shows how much of the model has arrived and translates nothing yet", () =>
    Effect.gen(function* test() {
      const fake = fakeEngineWith(() => Stream.concat(Stream.make(PROGRESS), Stream.never));
      yield* mount(fake.engine);
      yield* Effect.promise(() => expect.element(page.getByText("123 / 573 MB")).toBeVisible());
      yield* Effect.promise(() =>
        expect
          .element(page.getByRole("progressbar", { name: "モデルを取得中" }))
          .toHaveValue(PROGRESS.received),
      );
      yield* Effect.promise(() => userEvent.fill(source, "Hello"));
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("翻訳しています..."));
      expect(fake.requests).toStrictEqual([]);
      yield* Effect.promise(() => expect(main).toMatchScreenshot("downloading"));
    }),
  );

  it.live("tries again after a failure and then translates", () =>
    Effect.gen(function* test() {
      const attempts: number[] = [];
      const fake = fakeEngineWith(() => {
        attempts.push(attempts.length);
        if (attempts.length === FIRST) {
          return Stream.fail({ message: FAILURE });
        }
        return Stream.empty;
      });
      yield* mount(fake.engine);
      yield* Effect.promise(() => expect.element(page.getByText(FAILURE)).toBeVisible());
      yield* Effect.promise(() => userEvent.fill(source, "Hello"));
      yield* Effect.promise(() => retry.click());
      yield* Effect.promise(() => expect.element(output).toHaveTextContent("JA: Hello"));
      yield* Effect.promise(() => expect.element(retry).not.toBeInTheDocument());
    }),
  );
});
