import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Exit, Option, Record as Rec, String as Str, pipe } from "effect";
import type { FileSystem, Path, PlatformError } from "effect";
import type { ChildProcessSpawner } from "effect/process";
import { expect } from "vite-plus/test";

import { betterleaksDetector, resolveBetterleaks } from "./betterleaks.ts";
import type { Detector } from "./betterleaks.ts";
import type { WatashiFailed } from "./errors.ts";
import {
  ALNUM,
  NON_SECRETS,
  PLACEMENTS,
  fakeSecrets,
  imageLine,
  nonSecretLine,
  pick,
  userMessage,
  vendoredBetterleaks,
} from "./fake-secrets.test.support.ts";
import type { FakeSecret, Placement } from "./fake-secrets.test.support.ts";
import { encodeJson, isJsonArray, isObject, parseLines } from "./json-lines.ts";
import type { Json } from "./json-lines.ts";
import { maskWith } from "./mask.ts";

type Finding = Effect.Success<ReturnType<Detector>>[number];

const IMAGE_LENGTH = 4000;
const SIGNATURE_LENGTH = 400;
const CROSSING_START = 4;
const CROSSING_END = 5;
const REPEATED = 3;
const NONE = 0;
const ONE = 1;

const realDetector = vendoredBetterleaks.pipe(
  Effect.flatMap((path) => resolveBetterleaks(Option.some(path))),
  Effect.flatMap(betterleaksDetector),
);

const stringsOf = (value: Json): readonly string[] => {
  if (typeof value === "string") {
    return [value];
  }
  if (isJsonArray(value)) {
    return pipe(value, Arr.flatMap(stringsOf));
  }
  if (isObject(value)) {
    return pipe(Rec.values(value), Arr.flatMap(stringsOf));
  }
  return [];
};

const decoded = (text: string): string =>
  pipe(
    parseLines(text),
    Arr.flatMap((line) => pipe(Option.toArray(line.json), Arr.flatMap(stringsOf))),
    Arr.join("\n"),
  );

const finding = (secret: string): Finding => ({
  ruleId: "fake",
  secret,
  encoded: false,
  startLine: 1,
  endLine: 1,
  startColumn: 1,
  endColumn: NONE,
});

const detectWord =
  (word: string): Detector =>
  (text) =>
    Effect.succeed(
      pipe(
        [finding(word)],
        Arr.filter(() => Str.includes(word)(text)),
      ),
    );

type Recorder = Readonly<{ seen: () => string; detect: Detector }>;

const recorder = (): Recorder => {
  const seen: string[] = [];
  return {
    seen: () => Arr.join(seen, ""),
    detect: (text) => {
      seen.push(text);
      return detectWord("TOKEN123")(text);
    },
  };
};

const crossingDetector: Detector = (text) =>
  Effect.succeed(
    pipe(
      [{ ...finding(""), encoded: true, startLine: CROSSING_START, endLine: CROSSING_END }],
      Arr.filter(() => Str.includes("hello\nworld")(text)),
    ),
  );

const ghostDetector: Detector = () => Effect.succeed([finding("ghost")]);

const masksSecret =
  (detect: Detector, placement: Placement) =>
  (secret: FakeSecret): Effect.Effect<void, WatashiFailed> =>
    Effect.gen(function* masksOne() {
      const input = `${yield* placement.line(secret)}\n`;
      const needle = yield* placement.needle(secret);
      expect(decoded(input), secret.name).toContain(needle);
      const masked = yield* maskWith(detect)(input);
      expect(masked.redactions, secret.name).toBeGreaterThan(NONE);
      expect(masked.text, secret.name).not.toContain(needle);
      expect(decoded(masked.text), secret.name).not.toContain(needle);
      expect(decoded(masked.text), secret.name).not.toContain(secret.value);
    });

const masksEverySecret = (
  placement: Placement,
): Effect.Effect<
  void,
  WatashiFailed | PlatformError.PlatformError,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* masksPlacement() {
    const detect = yield* realDetector;
    const secrets = yield* fakeSecrets;
    yield* pipe(secrets, Effect.forEach(masksSecret(detect, placement)));
  }).pipe(Effect.scoped);

const keepsLines = Effect.gen(function* keepsLineOrder() {
  const detect = yield* realDetector;
  const secrets = yield* fakeSecrets;
  const header = yield* nonSecretLine;
  const lines = [header, ...(yield* pipe(secrets, Effect.forEach(userMessage.line)))];
  const masked = yield* maskWith(detect)(`${Arr.join(lines, "\n")}\n`);
  const out = parseLines(masked.text);
  expect(out).toHaveLength(lines.length + ONE);
  expect(
    pipe(
      out,
      Arr.map((line) => Option.isSome(line.json)),
    ),
  ).toEqual([
    ...pipe(
      lines,
      Arr.map(() => true),
    ),
    false,
  ]);
  expect(Arr.head(out).pipe(Option.map((line) => line.raw))).toEqual(Option.some(header));
}).pipe(Effect.scoped);

const keepsNonSecrets = Effect.gen(function* keepsIdentifiers() {
  const detect = yield* realDetector;
  const input = `${yield* nonSecretLine}\n`;
  const masked = yield* maskWith(detect)(input);
  expect(masked).toEqual({ text: input, redactions: NONE });
  expect(
    pipe(
      NON_SECRETS,
      Arr.every((value) => Str.includes(value)(decoded(masked.text))),
    ),
  ).toBe(true);
}).pipe(Effect.scoped);

const masksRepeats = Effect.gen(function* repeated() {
  const input = `${yield* encodeJson({ first: "x SECRET y SECRET", second: ["SECRET"] })}\n`;
  const masked = yield* maskWith(detectWord("SECRET"))(input);
  expect(masked.redactions).toBe(REPEATED);
  expect(masked.text).not.toContain("SECRET");
  expect(masked.text).toContain("[REDACTED:fake]");
});

const redactsCrossingLine = Effect.gen(function* crossing() {
  const line = yield* encodeJson({
    type: "user",
    uuid: "u1",
    parentUuid: "u0",
    greeting: "hello",
    place: "world",
  });
  const other = yield* encodeJson({ type: "assistant", uuid: "u2", message: "fine" });
  const masked = yield* maskWith(crossingDetector)(`${line}\n${other}\n`);
  const [first, second] = parseLines(masked.text);
  expect(Option.flatMap(Option.fromNullishOr(first), (parsed) => parsed.json)).toEqual(
    Option.some({
      type: "watashi-redacted-line",
      originalType: "user",
      uuid: "u1",
      parentUuid: "u0",
    }),
  );
  expect(Option.map(Option.fromNullishOr(second), (parsed) => parsed.raw)).toEqual(
    Option.some(other),
  );
});

const refusesGhost = Effect.gen(function* ghost() {
  const input = `${yield* encodeJson({ key: "value" })}\n`;
  const exit = yield* Effect.exit(maskWith(ghostDetector)(input));
  expect(Exit.isFailure(exit)).toBe(true);
});

const skipsImages = Effect.gen(function* image() {
  const data = pick(ALNUM)(IMAGE_LENGTH);
  const recorded = recorder();
  const input = `${yield* imageLine(data)}\n`;
  const masked = yield* maskWith(recorded.detect)(input);
  expect(masked.text).toBe(input);
  expect(recorded.seen()).not.toContain(data);
});

const thinkingLine =
  (signature: string) =>
  (text: string): Effect.Effect<string> =>
    encodeJson({
      type: "assistant",
      message: {
        role: "assistant",
        content: [
          { type: "thinking", thinking: text, signature },
          { type: "redacted_thinking", data: signature },
        ],
      },
    });

const skipsSignatures = Effect.gen(function* thinking() {
  const signature = pick(ALNUM)(SIGNATURE_LENGTH);
  const line = thinkingLine(signature);
  const recorded = recorder();
  const masked = yield* maskWith(recorded.detect)(`${yield* line("uses TOKEN123")}\n`);
  expect(masked.text).toBe(`${yield* line("uses [REDACTED:fake]")}\n`);
  expect(recorded.seen()).not.toContain(signature);
});

const masksPlainLines = Effect.gen(function* plainText() {
  const masked = yield* maskWith(detectWord("TOKEN123"))("plain TOKEN123 line\n");
  expect(masked.text).toBe("plain [REDACTED:fake] line\n");
});

layer(nodeServices)("mask with betterleaks", (it) => {
  for (const placement of PLACEMENTS) {
    it.effect(`removes every secret from a ${placement.name}`, () => masksEverySecret(placement));
  }
  it.effect("keeps every line as JSON in the same order", () => keepsLines);
  it.effect("leaves IDs, commits, UUIDs, paths and Japanese alone", () => keepsNonSecrets);
});

layer(nodeServices)("mask fails safe", (it) => {
  it.effect("masks a secret every time it appears", () => masksRepeats);
  it.effect("redacts the whole line when a finding crosses strings", () => redactsCrossingLine);
  it.effect("refuses to send when a finding never goes away", () => refusesGhost);
  it.effect("never scans or rewrites image base64", () => skipsImages);
  it.effect("scans thinking but never its signature", () => skipsSignatures);
  it.effect("masks lines that are not JSON", () => masksPlainLines);
});
