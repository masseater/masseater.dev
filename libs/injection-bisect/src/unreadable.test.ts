import { Effect, Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { zipOf } from "./__tests__/archive.ts";
import { INJECTION, fakeJudge, foundIn, outcomeIn } from "./__tests__/fake-judge.ts";
import { detect } from "./detect.ts";
import { InjectionJudge } from "./judge.ts";
import { outcomeOf } from "./outcome.ts";
import type { Document } from "./parser.ts";

const encoder = new TextEncoder();

const rawBytesOf = (binary: string): Uint8Array => Uint8Array.from(Buffer.from(binary, "latin1"));

const SHIFT_JIS_HELLO = rawBytesOf("\u0082\u00B1\u0082\u00F1\u0082\u00C9\u0082\u00BF\u0082\u00CD");

const namesIn = ({ unreadable = [] }: Document): readonly string[] =>
  pipe(
    unreadable,
    Arr.map(({ name }) => name),
  );

const reasonsIn = ({ unreadable = [] }: Document): readonly string[] =>
  pipe(
    unreadable,
    Arr.map(({ reason }) => reason),
  );

const TOO_DEEP = 300;

const APPLE_DOUBLE = "\u0000\u0005\u0016\u0007\u0000\u0002\u0000\u0000Mac OS X";

const README = "# 使い方\n\n設定ファイルを置きます。";

const mailOf = (lines: readonly string[]): string => pipe(lines, Arr.join("\r\n"));

const HEADERS = ["From: sato@example.com", "To: tanaka@example.com", "Subject: memo"] as const;

const nestedTooDeep = mailOf([
  ...HEADERS,
  "MIME-Version: 1.0",
  ...pipe(
    Arr.makeBy(TOO_DEEP, (level) => [
      `Content-Type: multipart/mixed; boundary="b${level}"`,
      "",
      `--b${level}`,
    ]),
    Arr.flatten,
  ),
  "Content-Type: text/plain",
  "",
  "本文です。",
  "",
]);

test("marks a zip entry that cannot be read as unreadable instead of clean", () =>
  Effect.runPromise(
    Effect.gen(function* brokenEntry() {
      const bytes = yield* zipOf({ "docs/readme.md": README, "data/broken.zip": "not a zip" });
      const { document, outcome } = yield* outcomeIn({ bytes, name: "bundle.zip" });
      expect(document.text).toContain("設定ファイルを置きます。");
      expect(namesIn(document)).toStrictEqual(["data/broken.zip"]);
      expect(reasonsIn(document)).toStrictEqual([expect.stringContaining("invalid zip")]);
      expect(outcome).toBe("unreadable");
    }),
  ));

test("marks a binary zip entry as unreadable instead of dropping it", () =>
  Effect.runPromise(
    Effect.gen(function* binaryEntry() {
      const bytes = yield* zipOf({ "docs/readme.md": README, "bin/tool": "\u0000\u0001\u0002" });
      const { document, outcome } = yield* outcomeIn({ bytes });
      expect(document.text).not.toContain("bin/tool");
      expect(document.unreadable).toStrictEqual([{ name: "bin/tool", reason: "binary data" }]);
      expect(outcome).toBe("unreadable");
    }),
  ));

test("names an unreadable entry of a nested archive by its path", () =>
  Effect.runPromise(
    Effect.gen(function* nested() {
      const inner = yield* zipOf({ "bin/tool": "\u0000\u0001\u0002" });
      const bytes = yield* zipOf({ "docs/readme.md": README, "inner.zip": inner });
      const { document } = yield* outcomeIn({ bytes });
      expect(document.unreadable).toStrictEqual([
        { name: "inner.zip/bin/tool", reason: "binary data" },
      ]);
    }),
  ));

test("skips real macOS metadata and reads a file that only borrows its name", () =>
  Effect.runPromise(
    Effect.gen(function* metadata() {
      const bytes = yield* zipOf({
        "docs/readme.md": README,
        "__MACOSX/docs/._readme.md": APPLE_DOUBLE,
        "__MACOSX/._notes.txt": INJECTION,
        "site/.DS_Store": `メモです。${INJECTION}`,
      });
      const { document, found } = yield* foundIn({ bytes });
      expect(document.unreadable).toBeUndefined();
      expect(document.text).not.toContain("._readme.md");
      expect(document.text).toContain("## __MACOSX/._notes.txt");
      expect(document.text).toContain("## site/.DS_Store");
      expect(pipe(found, Arr.join(""))).toContain(INJECTION);
    }),
  ));

test("marks text that is not valid UTF-8 as unreadable instead of clean", () =>
  Effect.runPromise(
    Effect.gen(function* invalidUtf8() {
      const { document, outcome } = yield* outcomeIn({ bytes: SHIFT_JIS_HELLO, name: "memo.txt" });
      expect(document.unreadable).toStrictEqual([
        { name: "memo.txt", reason: "not valid UTF-8 text" },
      ]);
      expect(outcome).toBe("unreadable");
    }),
  ));

test("marks text with NUL bytes as unreadable binary data", () =>
  Effect.runPromise(
    Effect.gen(function* utf16() {
      const { document, outcome } = yield* outcomeIn({
        bytes: encoder.encode("h\u0000e\u0000l\u0000l\u0000o\u0000"),
        format: "plain",
      });
      expect(document.unreadable).toStrictEqual([{ name: "", reason: "binary data" }]);
      expect(outcome).toBe("unreadable");
    }),
  ));

test("marks an mbox message that cannot be parsed and still reads the others", () =>
  Effect.runPromise(
    Effect.gen(function* brokenMessage() {
      const raw = mailOf([
        "From sato@example.com Mon Oct 12 09:00:00 2026",
        ...HEADERS,
        "",
        "明日の会議は十時からです。",
        "",
        "From sato@example.com Mon Oct 12 10:00:00 2026",
        nestedTooDeep,
      ]);
      const { document, outcome } = yield* outcomeIn({ bytes: encoder.encode(raw) });
      expect(document.text).toContain("明日の会議は十時からです。");
      expect(namesIn(document)).toStrictEqual(["message 2"]);
      expect(reasonsIn(document)).toStrictEqual([expect.stringContaining("nesting depth")]);
      expect(outcome).toBe("unreadable");
    }),
  ));

test("keeps the bytes of an mbox message that is not UTF-8", () =>
  Effect.runPromise(
    Effect.gen(function* latin1() {
      const head = mailOf([
        "From sato@example.com Mon Oct 12 09:00:00 2026",
        ...HEADERS,
        "Content-Type: text/plain; charset=iso-8859-1",
        "Content-Transfer-Encoding: 8bit",
        "",
        ">From the caf\u00E9",
        "",
      ]);
      const { document, outcome } = yield* outcomeIn({ bytes: rawBytesOf(head) });
      expect(document.text).toContain("From the café");
      expect(document.unreadable).toBeUndefined();
      expect(outcome).toBe("clean");
    }),
  ));

test("marks the attachments of an email as unreadable instead of clean", () =>
  Effect.runPromise(
    Effect.gen(function* attachment() {
      const raw = mailOf([
        ...HEADERS,
        "MIME-Version: 1.0",
        'Content-Type: multipart/mixed; boundary="b"',
        "",
        "--b",
        "Content-Type: text/plain; charset=utf-8",
        "",
        "資料を添付します。",
        "--b",
        'Content-Type: text/plain; name="note.txt"',
        'Content-Disposition: attachment; filename="note.txt"',
        "",
        INJECTION,
        "--b",
        "Content-Type: image/png",
        "Content-Transfer-Encoding: base64",
        "",
        "iVBORw0KGgo=",
        "--b--",
        "",
      ]);
      const { document, outcome } = yield* outcomeIn({ bytes: encoder.encode(raw), name: "a.eml" });
      expect(document.text).toContain("資料を添付します。");
      expect(document.unreadable).toStrictEqual([
        { name: "note.txt", reason: "attachment is not read" },
        { name: "image/png", reason: "attachment is not read" },
      ]);
      expect(outcome).toBe("unreadable");
    }),
  ));

test("reports an injection found beside unreadable parts as injected", () =>
  Effect.runPromise(
    Effect.gen(function* injected() {
      const unreadable = [{ name: "bin/tool", reason: "binary data" }];
      const detection = yield* detect(`今日は晴れ。${INJECTION}`, { unreadable }).pipe(
        Effect.provideService(InjectionJudge, fakeJudge),
      );
      expect(detection.unreadable).toStrictEqual(unreadable);
      expect(outcomeOf(detection)).toBe("injected");
    }),
  ));

test("reports clean and adds no field when every part was read", () =>
  Effect.runPromise(
    Effect.gen(function* clean() {
      const detection = yield* detect("今日は晴れ。", { unreadable: [] }).pipe(
        Effect.provideService(InjectionJudge, fakeJudge),
      );
      expect(detection).not.toHaveProperty("unreadable");
      expect(outcomeOf(detection)).toBe("clean");
    }),
  ));
