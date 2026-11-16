import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { page } from "vite-plus/test/browser";

import { fixtureOf } from "./fixture.test.support.ts";
import { mount } from "./mount.test.support.ts";

const CLICK = new URL("click.wav", import.meta.url).href;
const CLICK_FRAMES = 2205;

const main = page.getByRole("main");
const play = page.getByRole("button", { name: "再生", exact: true });
const pause = page.getByRole("button", { name: "一時停止" });
const total = page.getByText("0:16", { exact: true });

const ready = Effect.promise(() => expect.element(total).toBeVisible());

describe("a mounted song", () => {
  it.live("draws the session once the song is rendered", () =>
    Effect.gen(function* test() {
      const fixture = fixtureOf({ click: CLICK });
      yield* mount(fixture.song);
      yield* ready;
      expect(fixture.heard()["click"]).toHaveLength(CLICK_FRAMES);
      yield* Effect.promise(() => expect.element(page.getByText("start")).toBeVisible());
      yield* Effect.promise(() => expect(main).toMatchScreenshot("ready"));
    }),
  );

  it.live("shows one track in the piano roll when its chip is chosen", () =>
    Effect.gen(function* test() {
      yield* mount(fixtureOf({}).song);
      yield* ready;
      const chip = page.getByRole("button", { name: "BASS" }).last();
      yield* Effect.promise(() => chip.click());
      yield* Effect.promise(() => expect.element(chip).toHaveAttribute("aria-pressed", "true"));
      yield* Effect.promise(() => expect.element(page.getByText("sub ×8")).toBeVisible());
      yield* Effect.promise(() => expect(main).toMatchScreenshot("one-track"));
    }),
  );
});

describe("the transport of a mounted song", () => {
  it.live("zooms the tracks and moves to the clicked time", () =>
    Effect.gen(function* test() {
      yield* mount(fixtureOf({}).song);
      yield* ready;
      const widen = page.getByRole("button", { name: "トラックを横に広げる" });
      yield* Effect.promise(() => widen.click());
      yield* Effect.promise(() => expect.element(widen).toBeDisabled());
      yield* Effect.promise(() => main.getByRole("img", { name: "波形" }).click());
      yield* Effect.promise(() => expect.element(page.getByText("0:08")).toBeVisible());
      yield* Effect.promise(() => expect.element(page.getByText("drop")).toBeVisible());
      yield* Effect.promise(() => expect(main).toMatchScreenshot("zoomed-and-moved"));
    }),
  );

  it.live("plays and pauses", () =>
    Effect.gen(function* test() {
      yield* mount(fixtureOf({}).song);
      yield* ready;
      yield* Effect.promise(() => play.click());
      yield* Effect.promise(() => expect.element(pause).toBeVisible());
      yield* Effect.promise(() => expect.element(page.getByText("0:01")).toBeVisible());
      yield* Effect.promise(() => pause.click());
      yield* Effect.promise(() => expect.element(play).toBeVisible());
    }),
  );

  it.live("says why a song could not be rendered", () =>
    Effect.gen(function* test() {
      yield* mount(fixtureOf({ click: `${CLICK}.missing` }).song);
      yield* Effect.promise(() => expect.element(page.getByText(/^error: /u)).toBeVisible());
    }),
  );
});

const NARROW = { width: 520, height: 1400 } as const;
const WIDE = { width: 1180, height: 1400 } as const;
const FRAMES = "200 millis";

const widenedTimeline = Effect.gen(function* widenedTimeline() {
  yield* Effect.promise(() => page.viewport(NARROW.width, NARROW.height));
  yield* mount(fixtureOf({}).song);
  yield* ready;
  yield* Effect.promise(() => page.getByRole("button", { name: "トラックを横に広げる" }).click());
  return page.getByRole("group", { name: "トラックのタイムライン" }).element();
});

describe("the tracks of a mounted song", () => {
  it.live("stay where the reader scrolled them while paused, with their names in view", () =>
    Effect.gen(function* test() {
      const timeline = yield* widenedTimeline;
      const end = timeline.scrollWidth - timeline.clientWidth;
      timeline.scrollLeft = end;
      yield* Effect.sleep(FRAMES);
      const name = page.getByRole("button", { name: "DRUMS" }).first().element();
      expect(end + name.getBoundingClientRect().width).toBeGreaterThan(timeline.clientWidth);
      expect(timeline.scrollLeft).toBe(end);
      expect(Math.round(name.getBoundingClientRect().left)).toBe(
        Math.round(timeline.getBoundingClientRect().left),
      );
      yield* Effect.promise(() => page.viewport(WIDE.width, WIDE.height));
    }),
  );
});
