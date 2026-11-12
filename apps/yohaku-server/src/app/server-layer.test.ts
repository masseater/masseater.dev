import { expect, layer } from "@effect/vitest";
import { YohakuClient } from "@masseater.dev/yohaku-protocol";
import type { Paragraph } from "@masseater.dev/yohaku-protocol";
import { Array, Effect, Option, Stream, String, pipe } from "effect";

import { DRAFT, TITLE } from "./fake-agent.test.support.ts";
import {
  bearer,
  judgedKinds,
  lastPrompt,
  mcpCall,
  testLayer,
  written,
} from "./server.test.support.ts";

const PROSE = "鏡の中で、かぐやの顔が笑っていた。胸の奥がじんわりと温かくなった。";
const MEMO = "彩葉に見られる　ヤチヨ焦る　でもちょっと嬉しい　ふりは続ける？";
const LONG_REPEAT = 20;
const LONG_PROSE = pipe(
  "ヤチヨは保管庫の奥から、古いアバターを引っぱり出した。",
  String.repeat(LONG_REPEAT),
);
const EMOTION = "胸の奥がじんわりと温かくなった。";
const EXCERPT_START = 0;
const EXCERPT_END = 80;
const UNAUTHORIZED = 401;
const OK = 200;
const WATCHING_MEMO = "第 1 話の視聴メモ";
const VOICE = "「やっほー」と手を振る";
const WRITER_TITLE = "久しぶりの服";
const SOURCE_URL = "https://dic.pixiv.net/a/ヤチヨ";
const SOURCE_FACT = "8000 年待って彩葉と再会する";

const idOf = (paragraph: Option.Option<typeof Paragraph.Type>): string =>
  pipe(paragraph, Option.match({ onNone: () => String.empty, onSome: ({ id }) => id }));

const reopens = Effect.gen(function* reopens() {
  const { OpenManuscript: openManuscript, ListManuscripts: listManuscripts } = yield* YohakuClient;
  const { id, paragraphs } = yield* written([PROSE, MEMO]);
  const opened = yield* openManuscript({ id });
  expect(opened.paragraphs).toStrictEqual(paragraphs);
  expect(opened.manuscript.title).toBeNull();
  const { manuscripts } = yield* listManuscripts();
  const excerpt = pipe(
    manuscripts,
    Array.findFirst((manuscript) => manuscript.id === id),
    Option.map((manuscript) => manuscript.excerpt),
  );
  const expected = pipe(PROSE, String.slice(EXCERPT_START, EXCERPT_END));
  expect(excerpt).toStrictEqual(Option.some(expected));
});

const remarksOnlyProse = Effect.gen(function* remarksOnlyProse() {
  const { GetAnnotations: getAnnotations } = yield* YohakuClient;
  const { id, paragraphs } = yield* written([PROSE, MEMO]);
  const proseId = idOf(Array.head(paragraphs));
  const memoId = idOf(Array.last(paragraphs));
  const annotated = yield* getAnnotations({ id });
  expect(annotated.kinds).toStrictEqual([
    { paragraphId: proseId, kind: "prose" },
    { paragraphId: memoId, kind: "memo" },
  ]);
  const marked = pipe(
    annotated.remarks,
    Array.map(({ paragraphId, from, to, message }) => ({
      paragraphId,
      message,
      text: pipe(PROSE, String.slice(from, to)),
    })),
  );
  expect(marked).toStrictEqual([{ paragraphId: proseId, message: "感情の説明", text: EMOTION }]);
});

const judgesOnce = Effect.gen(function* judgesOnce() {
  const { GetAnnotations: getAnnotations } = yield* YohakuClient;
  const { id } = yield* written([`${PROSE}二度目。`, `${MEMO}二度目`]);
  yield* getAnnotations({ id });
  const first = yield* judgedKinds;
  yield* getAnnotations({ id });
  const second = yield* judgedKinds;
  expect(second).toBe(first);
});

const keepsDismissed = Effect.gen(function* keepsDismissed() {
  const { DismissRemark: dismissRemark, GetAnnotations: getAnnotations } = yield* YohakuClient;
  const { id, paragraphs } = yield* written([PROSE]);
  const paragraphId = idOf(Array.head(paragraphs));
  yield* dismissRemark({ id, paragraphId, rule: "emotion_explained" });
  const { remarks } = yield* getAnnotations({ id });
  expect(remarks).toStrictEqual([]);
});

const ingested = Effect.gen(function* ingested() {
  const { IngestText: ingestText } = yield* YohakuClient;
  const source = yield* ingestText({ text: SOURCE_URL });
  expect(source).toMatchObject({ origin: "agent", facts: 2 });
  return source;
});

const draftsWithSources = Effect.gen(function* draftsWithSources() {
  const { RevertSource: revertSource, DraftFromMemo: draftFromMemo } = yield* YohakuClient;
  const source = yield* ingested;
  const { id, paragraphs } = yield* written([PROSE, MEMO]);
  const paragraphId = idOf(Array.last(paragraphs));
  const draft = yield* draftFromMemo({ id, paragraphId }).pipe(Stream.mkString);
  expect(draft).toBe(pipe(DRAFT, Array.join(String.empty)));
  const prompt = yield* lastPrompt;
  expect(prompt).toContain(SOURCE_FACT);
  expect(prompt).toContain(PROSE);
  yield* revertSource({ id: source.id });
});

const addedByMcp = Effect.gen(function* addedByMcp() {
  const { ListSources: listSources } = yield* YohakuClient;
  const denied = yield* mcpCall({ name: "list_facts", args: {}, headers: {} });
  expect(denied.status).toBe(UNAUTHORIZED);
  const authorization = yield* bearer;
  const added = yield* mcpCall({
    name: "add_source",
    args: {
      label: WATCHING_MEMO,
      facts: [{ kind: "voice", subject: "かぐや", body: VOICE, when: "第 1 話" }],
    },
    headers: { ...authorization, "user-agent": "claude-code/2.3.0" },
  });
  expect(added.status).toBe(OK);
  const { sources } = yield* listSources();
  return pipe(
    sources,
    Array.findFirst(({ label }) => label === WATCHING_MEMO),
  );
});

const mcpRevertable = Effect.gen(function* mcpRevertable() {
  const { RevertSource: revertSource } = yield* YohakuClient;
  const memo = yield* addedByMcp;
  const summary = pipe(
    memo,
    Option.map(({ origin, client, facts }) => ({ origin, client, facts })),
  );
  expect(summary).toStrictEqual(Option.some({ origin: "mcp", client: "Claude Code", facts: 1 }));
  const authorization = yield* bearer;
  const facts = yield* mcpCall({ name: "list_facts", args: {}, headers: authorization });
  expect(facts.text).toContain(VOICE);
  yield* pipe(
    Option.toArray(memo),
    Effect.forEach(({ id }) => revertSource({ id })),
  );
  const after = yield* mcpCall({ name: "list_facts", args: {}, headers: authorization });
  expect(after.text).not.toContain(VOICE);
});

const writerTitleWins = Effect.gen(function* writerTitleWins() {
  const { GetAnnotations: getAnnotations, SetTitle: setTitle } = yield* YohakuClient;
  const { id } = yield* written([LONG_PROSE]);
  const proposed = yield* getAnnotations({ id });
  expect(proposed.title).toStrictEqual({ text: TITLE, by: "ai" });
  yield* setTitle({ id, text: WRITER_TITLE });
  const kept = yield* getAnnotations({ id });
  expect(kept.title).toStrictEqual({ text: WRITER_TITLE, by: "writer" });
});

const missingIsNotFound = Effect.gen(function* missingIsNotFound() {
  const { OpenManuscript: openManuscript } = yield* YohakuClient;
  const failure = yield* openManuscript({ id: "missing" }).pipe(Effect.flip);
  expect(failure).toMatchObject({ reason: "NotFound" });
});

layer(testLayer, { timeout: "30 seconds" })("yohaku server", (it) => {
  it.effect("書き始めるだけで原稿ができ、書いた段落をそのまま開き直せる", () => reopens);
  it.effect("メモはメモとして見分け、感情の説明は本文にだけ指摘する", () => remarksOnlyProse);
  it.effect("一度見分けた段落は AI に問い直さない", () => judgesOnce);
  it.effect("「残す」と決めた指摘は同じ段落に二度と出さない", () => keepsDismissed);
  it.effect("メモの下書きには、資料と直前までの本文を渡す", () => draftsWithSources);
  it.effect("MCP はトークンのない呼び出しを断り、足した資料は戻せる", () => mcpRevertable);
  it.effect("題名は書き手のものを優先し、無いときだけ AI が仮に付ける", () => writerTitleWins);
  it.effect("無い原稿は NotFound で返す", () => missingIsNotFound);
});
