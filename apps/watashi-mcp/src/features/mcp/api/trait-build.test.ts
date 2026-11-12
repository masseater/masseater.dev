import { afterAll, expect, it } from "@effect/vitest";
import { Effect, Option, Record as Rec } from "effect";
import { vi } from "vite-plus/test";

import { writeMemory } from "./memory-write.server";
import {
  drain,
  forgetRequests,
  nothing,
  requests,
  settle,
  sourceWith,
  step,
} from "./trait-build.test.support";
import type { Respond } from "./trait-build.test.support";
import { profileTraits, traitDetail } from "./trait-read.server";
import { closeDatabase, resetDatabase } from "./trait.test.support.ts";

vi.mock("cloudflare:workers", () => import("./trait.test.support.ts"));

afterAll(() => Effect.runPromise(closeDatabase));

const writer = { actor: "test" };

const EDITOR = "毎日 Neovim で書いている。VS Code は重いので使わない";

const LINT = "lint の抑止コメントで検査を通してはいけない";

const ONCE = 1;

const everything = { scope: Option.none(), topic: Option.none() };

const learnsBoth: Respond = (request) => [
  {
    action: "new",
    source: sourceWith("Neovim")(request),
    quote: "毎日 Neovim で書いている",
    kind: "stack",
    limited: false,
    statement: "Use Neovim as the editor.",
    why: "",
  },
  {
    action: "new",
    source: sourceWith("抑止")(request),
    quote: LINT,
    kind: "rule",
    limited: true,
    statement: "Never pass lint by suppressing it.",
    why: "Checks must not become a formality.",
  },
];

const setUp = forgetRequests.pipe(
  Effect.andThen(resetDatabase),
  Effect.andThen(
    writeMemory(writer)({
      project: "assistant",
      name: "editor",
      description: "エディタ",
      content: EDITOR,
    }),
  ),
  Effect.andThen(
    writeMemory(writer)({ project: "repo-a", name: "lint", description: "lint", content: LINT }),
  ),
);

const learned = setUp.pipe(Effect.andThen(drain(learnsBoth)));

it.effect("作業メモから特性を作り、種類ごとにまとめて返す", () =>
  Effect.gen(function* learnsFromMemories() {
    const outcomes = yield* learned;
    expect(outcomes).toMatchObject([
      { origin: "memory", sources: 2, accepted: 2, rejected: 0, created: 2 },
    ]);
    const all = yield* profileTraits(everything);
    expect(all).toMatchObject({
      rule: [{ ref: "owner_trait:2", scope: "repo-a", supports: 1, store: "memory" }],
      stack: [{ ref: "owner_trait:1", scope: "global", statement: "Use Neovim as the editor." }],
    });
    const other = yield* profileTraits({ ...everything, scope: Option.some("repo-b") });
    expect(Rec.keys(other)).toStrictEqual(["stack"]);
    const detail = yield* traitDetail("owner_trait:2");
    expect(detail).toMatchObject({
      status: "active",
      why: "Checks must not become a formality.",
      evidence: [{ stance: "supports", quote: LINT }],
      revisions: [{ rev: 1, op: "create", actor: "trait-builder" }],
    });
  }),
);

it.effect("一度読んだ源は読み直さない", () =>
  Effect.gen(function* stopsAfterCursor() {
    yield* learned;
    const outcome = yield* step(learnsBoth);
    expect(outcome).toStrictEqual({ status: "idle" });
    expect(requests).toHaveLength(ONCE);
  }),
);

it.effect("書いて 1 分たたない源はまだ読まない", () =>
  Effect.gen(function* waitsForSettledRows() {
    yield* setUp;
    const outcome = yield* step(learnsBoth);
    expect(outcome).toStrictEqual({ status: "idle" });
  }),
);

it.effect("原文に無い引用・候補でない特性・渡していない源への観察は捨てる", () =>
  Effect.gen(function* rejectsUngrounded() {
    yield* learned;
    yield* settle;
    yield* writeMemory(writer)({ project: "assistant", name: "editor", content: `${EDITOR}。` });
    const outcomes = yield* drain((request) => [
      {
        action: "new",
        source: sourceWith("Neovim")(request),
        quote: "Emacs を愛用している",
        kind: "stack",
        limited: false,
        statement: "Use Emacs.",
        why: "",
      },
      {
        action: "supports",
        source: sourceWith("Neovim")(request),
        quote: "毎日 Neovim で書いている",
        trait: "owner_trait:99",
      },
      {
        action: "new",
        source: "memory:404",
        quote: "毎日 Neovim で書いている",
        kind: "stack",
        limited: false,
        statement: "From a source that was not given.",
        why: "",
      },
    ]);
    expect(outcomes).toMatchObject([{ accepted: 0, rejected: 3, retracted: 1 }]);
  }),
);

it.effect("根拠の作業メモを取り消すと特性も取り消す", () =>
  Effect.gen(function* retractsWithSource() {
    yield* learned;
    yield* settle;
    yield* writeMemory(writer)({ project: "repo-a", name: "lint", retract: true, reason: "誤り" });
    const outcomes = yield* drain(nothing);
    expect(outcomes).toMatchObject([{ origin: "memory", sources: 1, retracted: 1 }]);
    expect(requests).toHaveLength(ONCE);
    const all = yield* profileTraits(everything);
    expect(Rec.keys(all)).toStrictEqual(["stack"]);
    const detail = yield* traitDetail("owner_trait:2");
    expect(detail).toMatchObject({
      status: "retracted",
      evidence: [],
      revisions: [
        { rev: 2, op: "retract" },
        { rev: 1, op: "create" },
      ],
    });
  }),
);

it.effect("書き換えた作業メモが別の特性を示せば古い特性を置き換える", () =>
  Effect.gen(function* supersedesTrait() {
    yield* learned;
    yield* settle;
    yield* writeMemory(writer)({
      project: "assistant",
      name: "editor",
      content: "Neovim をやめて Zed に移った",
    });
    yield* drain((request) => [
      {
        action: "replace",
        source: sourceWith("Zed")(request),
        quote: "Zed に移った",
        trait: "owner_trait:1",
        kind: "stack",
        limited: false,
        statement: "Use Zed as the editor.",
        why: "",
      },
    ]);
    const all = yield* profileTraits(everything);
    expect(all).toMatchObject({
      stack: [{ ref: "owner_trait:3", statement: "Use Zed as the editor." }],
    });
    const old = yield* traitDetail("owner_trait:1");
    expect(old).toMatchObject({ status: "superseded", supersededBy: "owner_trait:3" });
  }),
);

it.effect("別のプロジェクトの根拠にも支えられた特性は global にする", () =>
  Effect.gen(function* promotesScope() {
    yield* learned;
    yield* settle;
    yield* writeMemory(writer)({
      project: "repo-b",
      name: "lint",
      description: "lint",
      content: "repo-b でも lint の抑止コメントは禁止",
    });
    const outcomes = yield* drain((request) => [
      {
        action: "supports",
        source: sourceWith("repo-b")(request),
        quote: "lint の抑止コメントは禁止",
        trait: "owner_trait:2",
      },
    ]);
    expect(outcomes).toMatchObject([{ accepted: 1, touched: 1 }]);
    const detail = yield* traitDetail("owner_trait:2");
    expect(detail).toMatchObject({ scope: "global", supports: 2 });
  }),
);
