import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  Result,
  Schema,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { endpointsOf } from "#/features/audit-workflows/api/endpoints.ts";
import { decodePacket, encodePackets } from "#/shared/git-protocol/pkt-line.ts";

import { bestTag } from "./github-refs.ts";
import { FIXTURE, KNOWN, Recorded, knownIds, verdictOf } from "./zizmor-units.test.support.ts";
import type { Outcome, Units } from "./zizmor-units.test.support.ts";

type Case<Kind extends keyof Units> = Units[Kind][number];

const ERROR = "error";

const textDecoder = new TextDecoder();

const host = (found: Case<"githubHost">): Outcome => ({
  id: found.id,
  want: found.api,
  have: endpointsOf(found.host).api,
});

const tagOf = ([name, commit]: readonly [string, string]): { name: string; commit: string } => ({
  name,
  commit,
});

const tag = (found: Case<"bestTag">): Outcome => ({
  id: found.id,
  want: found.result,
  have: pipe(
    found.tags,
    Arr.map(tagOf),
    bestTag(Option.fromNullishOr(found.subpath))(found.commit),
    Option.map((best) => best.name),
    Option.getOrNull,
  ),
});

const encoded = (found: Case<"pktEncode">): Outcome => ({
  id: found.id,
  want: found.bytes,
  have: textDecoder.decode(encodePackets([found.packet])),
});

const wantDecoded = (found: Case<"pktDecode">): unknown => {
  if ("packet" in found.result) {
    return found.result.packet;
  }
  return ERROR;
};

const decoded = (found: Case<"pktDecode">): Outcome => ({
  id: found.id,
  want: wantDecoded(found),
  have: Result.getOrElse(decodePacket(Uint8Array.from(found.bytes)), (): unknown => ERROR),
});

const outcomesOf = (units: Units): readonly Outcome[] => [
  ...pipe(units.githubHost, Arr.map(host)),
  ...pipe(units.bestTag, Arr.map(tag)),
  ...pipe(units.pktEncode, Arr.map(encoded)),
  ...pipe(units.pktDecode, Arr.map(decoded)),
];

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("matches zizmor's unit tests for GitHub hosts, tags and pkt-lines", () =>
  Effect.gen(function* matchesZizmorRemote() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const text = yield* fileSystem.readFileString(path.join(dir, FIXTURE));
    const units = yield* Schema.decodeEffect(Recorded)(text);
    const knownText = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    const verdict = verdictOf(knownIds(knownText))(outcomesOf(units));
    expect(verdict).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
