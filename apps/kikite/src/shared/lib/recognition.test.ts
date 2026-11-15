import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Function as Fn, Option } from "effect";
import { TestClock } from "effect/testing";
import { afterEach, vi } from "vite-plus/test";

import { listen } from "./recognition.ts";

type Behavior = "starts" | "throws" | "silent";

const AFTER_START = "10 millis";
const AFTER_RETRIES = "5 seconds";
const AFTER_TIMEOUT = "10 seconds";
const STARTED_TWICE = 2;

const handlers = {
  onFinal: Fn.constVoid,
  onInterim: Fn.constVoid,
  onFailed: Fn.constVoid,
  onSound: Fn.constVoid,
};

const browser = (
  behaviors: readonly Behavior[],
): Readonly<{ Recognizer: new () => EventTarget; starts: () => number; end: () => void }> => {
  const state = { queue: [...behaviors], made: Arr.empty<EventTarget>(), starts: 0 };
  class FakeRecognizer extends EventTarget {
    public lang = "";
    public continuous = false;
    public interimResults = false;

    public constructor() {
      super();
      state.made.push(this);
    }

    public start(): void {
      state.starts += 1;
      const behavior = Option.getOrElse(
        Option.fromUndefinedOr(state.queue.shift()),
        () => "starts",
      );
      if (behavior === "throws") {
        throw new DOMException("recognition has already started", "InvalidStateError");
      }
      if (behavior === "starts") {
        this.dispatchEvent(new Event("start"));
      }
    }

    public abort(): void {
      this.dispatchEvent(new Event("end"));
    }
  }
  return {
    Recognizer: FakeRecognizer,
    starts: () => state.starts,
    end: () => {
      Option.map(Arr.last(state.made), (recognizer) => recognizer.dispatchEvent(new Event("end")));
    },
  };
};

const listening = (fake: ReturnType<typeof browser>): ReturnType<typeof listen> => {
  vi.stubGlobal("SpeechRecognition", fake.Recognizer);
  return listen(handlers);
};

describe("listen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.effect("starts again after the browser ends recognition", () =>
    Effect.scoped(
      Effect.gen(function* restarts() {
        const fake = browser([]);
        yield* listening(fake);
        fake.end();
        yield* Effect.yieldNow;
        yield* TestClock.adjust(AFTER_START);
        expect(fake.starts()).toBe(STARTED_TWICE);
      }),
    ),
  );

  it.effect("keeps trying when start throws instead of going deaf", () =>
    Effect.scoped(
      Effect.gen(function* keepsTrying() {
        const fake = browser(["starts", "throws", "throws"]);
        yield* listening(fake);
        fake.end();
        yield* Effect.yieldNow;
        yield* TestClock.adjust(AFTER_RETRIES);
        expect(fake.starts()).toBe(STARTED_TWICE + STARTED_TWICE);
      }),
    ),
  );

  it.effect("starts a new recognizer when the browser never confirms the start", () =>
    Effect.scoped(
      Effect.gen(function* renews() {
        const fake = browser(["silent"]);
        yield* listening(fake);
        yield* Effect.yieldNow;
        yield* TestClock.adjust(AFTER_TIMEOUT);
        expect(fake.starts()).toBe(STARTED_TWICE);
      }),
    ),
  );
});
