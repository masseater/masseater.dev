import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import {
  Array as Arr,
  ConfigProvider,
  Effect,
  FileSystem,
  Option,
  Path,
  Record as Rec,
  Stdio,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { Command } from "effect/cli";
import { HttpClient } from "effect/http";
import { expect } from "vite-plus/test";

import { watashi } from "./cli.ts";
import { githubToken, vendoredBetterleaks } from "./fake-secrets.test.support.ts";
import { fakeWatashi } from "./fake-watashi.test.support.ts";
import type { FakeWatashi } from "./fake-watashi.test.support.ts";

type Env = Readonly<Record<string, string>>;

type Setup = Readonly<{ root: string; transcript: string; base: Env; server: FakeWatashi }>;

const SESSION = "d2ecb348-3cde-4a66-93b9-6229842073a9";
const TOKEN = "wat_test";
const SUBAGENT = "agent-abc";
const PUT_COUNT = 2;
const GET_COUNT = 2;
const NONE = 0;

const encoder = new TextEncoder();

const lineOf = (id: string, extra = ""): string =>
  `{"type":"user","uuid":"u${id}","message":"m${id}${extra}"}\n`;

const keyOf = (file = SESSION): string => `claude-code/${SESSION}/${file}`;

const setup = Effect.gen(function* prepare() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "watashi-" });
  const transcript = path.join(root, "projects", `${SESSION}.jsonl`);
  yield* fs.makeDirectory(path.dirname(transcript), { recursive: true });
  yield* fs.writeFileString(transcript, "");
  const betterleaks = yield* vendoredBetterleaks;
  const base: Env = {
    WATASHI_HOME: path.join(root, "home"),
    WATASHI_URL: "https://watashi.test",
    WATASHI_BETTERLEAKS: betterleaks,
    WATASHI_SEND_CONVERSATIONS: "1",
    WATASHI_TOKEN: TOKEN,
  };
  const prepared: Setup = { root, transcript, base, server: fakeWatashi() };
  return prepared;
});

const append = Effect.fnUntraced(function* appendTo(test: Setup, text: string) {
  const fs = yield* FileSystem.FileSystem;
  yield* fs.writeFileString(test.transcript, text, { flag: "a" });
});

const stop = Effect.fnUntraced(function* runStop(test: Setup, env: Env) {
  const stdio = yield* Stdio.Stdio;
  const input = `{"session_id":"${SESSION}","transcript_path":"${test.transcript}","cwd":"/home/user"}`;
  const merged = pipe({ ...test.base, ...env }, Rec.filter(Str.isNonEmpty));
  const provider = ConfigProvider.fromEnv({ env: merged });
  const stdin = Stream.make(encoder.encode(input));
  yield* Command.runWith(watashi, { version: "test" })(["hook", "stop"]).pipe(
    Effect.provideService(Stdio.Stdio, { ...stdio, stdin }),
    Effect.provideService(ConfigProvider.ConfigProvider, provider),
    Effect.provideService(HttpClient.HttpClient, test.server.client),
  );
});

const sendsCompleteLines = Effect.gen(function* partial() {
  const test = yield* setup;
  yield* append(test, `${lineOf("1")}${lineOf("2")}{"type":"user","uuid":"u3"`);
  yield* stop(test, {});
  expect(test.server.text(keyOf())).toBe(`${lineOf("1")}${lineOf("2")}`);
  yield* append(test, ',"message":"m3"}\n');
  yield* stop(test, {});
  expect(test.server.text(keyOf())).toBe(`${lineOf("1")}${lineOf("2")}${lineOf("3")}`);
  expect(test.server.count("PUT")).toBe(PUT_COUNT);
  const authorized = pipe(
    test.server.requests(),
    Arr.every((request) => request.authorization === `Bearer ${TOKEN}`),
  );
  expect(authorized).toBe(true);
}).pipe(Effect.scoped);

const masksSecrets = Effect.gen(function* masks() {
  const test = yield* setup;
  const secret = githubToken();
  const line = lineOf("1", ` ${secret}`);
  yield* append(test, line);
  yield* stop(test, {});
  expect(test.server.text(keyOf())).toMatch(/\[REDACTED:github-pat\]/u);
  expect(test.server.text(keyOf())).not.toContain(secret);
  const query = test.server.firstQuery(keyOf());
  const lineBytes = String(encoder.encode(line).length);
  expect([query("redactions"), query("start"), query("end")]).toEqual([
    Option.some("1"),
    Option.some("0"),
    Option.some(lineBytes),
  ]);
}).pipe(Effect.scoped);

const resumesFromServer = Effect.gen(function* resumes() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const test = yield* setup;
  yield* append(test, `${lineOf("1")}${lineOf("2")}`);
  yield* stop(test, {});
  yield* fs.remove(path.join(test.root, "home", "offsets"), { recursive: true });
  yield* append(test, lineOf("3"));
  yield* stop(test, {});
  expect(test.server.text(keyOf())).toBe(`${lineOf("1")}${lineOf("2")}${lineOf("3")}`);
  expect(test.server.count("GET")).toBe(GET_COUNT);
}).pipe(Effect.scoped);

const realigns = Effect.gen(function* realign() {
  const test = yield* setup;
  yield* append(test, lineOf("1"));
  yield* test.server.conflictOnce;
  yield* stop(test, {});
  expect(test.server.text(keyOf())).toBe(lineOf("1"));
}).pipe(Effect.scoped);

const sendsSubagents = Effect.gen(function* subagents() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const test = yield* setup;
  yield* append(test, lineOf("1"));
  const agent = path.join(path.dirname(test.transcript), SESSION, "subagents", `${SUBAGENT}.jsonl`);
  yield* fs.makeDirectory(path.dirname(agent), { recursive: true });
  yield* fs.writeFileString(agent, lineOf("9"));
  yield* stop(test, {});
  expect(test.server.text(keyOf(`subagents/${SUBAGENT}`))).toBe(lineOf("9"));
}).pipe(Effect.scoped);

const addsMetadata = Effect.gen(function* metadata() {
  const test = yield* setup;
  yield* append(test, lineOf("1"));
  yield* stop(test, { CLAUDE_CODE_REMOTE: "true", CLAUDE_CODE_REMOTE_SESSION_ID: "cse_1" });
  const query = test.server.firstQuery(keyOf());
  expect([query("source"), query("cwd"), query("remoteSession")]).toEqual([
    Option.some("claude-code-cloud"),
    Option.some("/home/user"),
    Option.some("cse_1"),
  ]);
}).pipe(Effect.scoped);

const logsMissingBetterleaks = Effect.gen(function* missing() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const test = yield* setup;
  yield* append(test, lineOf("1"));
  yield* stop(test, { WATASHI_BETTERLEAKS: path.join(test.root, "missing-betterleaks") });
  expect(test.server.count("PUT")).toBe(NONE);
  const log = yield* fs.readFileString(path.join(test.root, "home", "hook.log"));
  expect(log).toContain("betterleaks");
}).pipe(Effect.scoped);

const respectsOptOut = Effect.gen(function* disabled() {
  const test = yield* setup;
  yield* append(test, lineOf("1"));
  yield* stop(test, { WATASHI_SEND_CONVERSATIONS: "0" });
  expect(test.server.requests()).toHaveLength(NONE);
}).pipe(Effect.scoped);

const needsLogin = Effect.gen(function* anonymous() {
  const test = yield* setup;
  yield* append(test, lineOf("1"));
  yield* stop(test, { WATASHI_TOKEN: "" });
  expect(test.server.requests()).toHaveLength(NONE);
}).pipe(Effect.scoped);

layer(nodeServices)("hook stop sends what grew", (it) => {
  it.effect(
    "sends only complete lines and leaves a half-written line for later",
    () => sendsCompleteLines,
  );
  it.effect("masks secrets before sending", () => masksSecrets);
  it.effect(
    "continues from the server's offset when the local record is gone",
    () => resumesFromServer,
  );
  it.effect("realigns with the server when the offsets disagree", () => realigns);
  it.effect("sends subagent transcripts as their own files", () => sendsSubagents);
  it.effect("adds the source, the cwd and the cloud session", () => addsMetadata);
  it.effect("sends nothing and logs when betterleaks is missing", () => logsMissingBetterleaks);
  it.effect("does nothing unless sending is allowed", () => respectsOptOut);
  it.effect("does nothing without a login", () => needsLogin);
});
