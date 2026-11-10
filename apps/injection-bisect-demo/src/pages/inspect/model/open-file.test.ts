import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect, test, vi } from "vite-plus/test";
import type { Mock } from "vite-plus/test";

import type { Opening } from "./draft";
import { MAX_CHARS } from "./models";
import { openerOf } from "./open-file";
import type { Picked } from "./open-file";

vi.mock("@r_masseater/injection-bisect", () => import("./injection-bisect.test.support"));

interface Probe {
  readonly opening: Mock<(opening: Opening) => void>;
  readonly draft: Mock<(draft: Readonly<{ text: string; format: string }>) => void>;
}

const encoder = new TextEncoder();

const SETTLED = "20 millis";

const OVER = 10;

const SECOND = "二つ目の本文";

const bufferOf = (text: string): ArrayBuffer => {
  const bytes = encoder.encode(text);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const fileOf = (name: string, text: string): Picked => ({
  name,
  load: (): Promise<ArrayBuffer> => Promise.resolve(bufferOf(text)),
});

const detached = (): ArrayBuffer => {
  const buffer = bufferOf("本文");
  buffer.transfer();
  return buffer;
};

const probe = (): Probe => ({ opening: vi.fn(), draft: vi.fn() });

const statusesOf = (calls: readonly (readonly [Opening])[]): readonly string[] =>
  pipe(
    calls,
    Arr.map(([{ status }]) => status),
  );

const textsOf = (calls: readonly (readonly [Readonly<{ text: string }>])[]): readonly string[] =>
  pipe(
    calls,
    Arr.map(([{ text }]) => text),
  );

test("ends as failed instead of reading when the read dies", () => {
  const sink = probe();
  openerOf(sink)({ name: "a.txt", load: (): Promise<ArrayBuffer> => Promise.resolve(detached()) });
  return vi.waitFor(() => {
    expect(statusesOf(sink.opening.mock.calls)).toStrictEqual(["reading", "failed"]);
  });
});

test("drops the first read when a second file is opened", () => {
  const sink = probe();
  const open = openerOf(sink);
  const first = Promise.withResolvers<ArrayBuffer>();
  open({ name: "first.txt", load: (): Promise<ArrayBuffer> => first.promise });
  open(fileOf("second.txt", SECOND));
  first.resolve(bufferOf("一つ目の本文"));
  const settled = Effect.sync(() => {
    expect(textsOf(sink.draft.mock.calls)).toStrictEqual([SECOND]);
    expect(statusesOf(sink.opening.mock.calls)).toStrictEqual(["reading", "reading", "idle"]);
  });
  return Effect.runPromise(Effect.andThen(Effect.sleep(SETTLED), settled));
});

test("keeps only the first MAX_CHARS characters of a long file and says so", () => {
  const sink = probe();
  openerOf(sink)(fileOf("long.txt", Str.repeat(MAX_CHARS + OVER)("あ")));
  return vi.waitFor(() => {
    expect(statusesOf(sink.opening.mock.calls)).toStrictEqual(["reading", "partial"]);
    expect(
      pipe(
        textsOf(sink.draft.mock.calls),
        Arr.map((text) => text.length),
      ),
    ).toStrictEqual([MAX_CHARS]);
  });
});
