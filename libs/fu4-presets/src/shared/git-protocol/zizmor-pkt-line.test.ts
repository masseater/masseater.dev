import { isDeepStrictEqual } from "node:util";

import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  Result,
  Schema,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { encodePackets, packetAt } from "./pkt-line.ts";

const FIXTURE = "../../features/audit-workflows/lib/fixtures/zizmor-units/units.json";
const ERROR = "error";
const FIRST = 0;

const PacketSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("data"), data: Schema.String }),
  Schema.Struct({ type: Schema.Literals(["flush", "delim"]) }),
]);
const Decoded = Schema.Union([
  Schema.Struct({ packet: PacketSchema }),
  Schema.Struct({ error: Schema.String }),
]);
const EncodeCase = Schema.Struct({ id: Schema.String, packet: PacketSchema, bytes: Schema.String });
const DecodeCase = Schema.Struct({
  id: Schema.String,
  bytes: Schema.Array(Schema.Int),
  result: Decoded,
});
const Recorded = Schema.fromJsonString(
  Schema.Struct({ pktEncode: Schema.Array(EncodeCase), pktDecode: Schema.Array(DecodeCase) }),
);

type Units = typeof Recorded.Type;

interface Outcome {
  readonly id: string;
  readonly want: unknown;
  readonly have: unknown;
}

const textDecoder = new TextDecoder();

const encoded = (found: Units["pktEncode"][number]): Outcome => ({
  id: found.id,
  want: found.bytes,
  have: textDecoder.decode(encodePackets([found.packet])),
});

const wantDecoded = (found: Units["pktDecode"][number]): unknown => {
  if ("packet" in found.result) {
    return found.result.packet;
  }
  return ERROR;
};

const firstPacket = (bytes: readonly number[]): unknown => {
  const step = packetAt(Uint8Array.from(bytes))(FIRST);
  return Result.match(step, { onFailure: () => ERROR, onSuccess: ([packet]) => packet });
};

const decoded = (found: Units["pktDecode"][number]): Outcome => ({
  id: found.id,
  want: wantDecoded(found),
  have: firstPacket(found.bytes),
});

const differs = (outcome: Outcome): boolean => !isDeepStrictEqual(outcome.want, outcome.have);

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("matches zizmor's unit tests for pkt-lines", () =>
  Effect.gen(function* matchesZizmorPktLine() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const text = yield* fileSystem.readFileString(path.join(dir, FIXTURE));
    const units = yield* Schema.decodeEffect(Recorded)(text);
    const outcomes = [
      ...pipe(units.pktEncode, Arr.map(encoded)),
      ...pipe(units.pktDecode, Arr.map(decoded)),
    ];
    expect(outcomes.length).toBeGreaterThan(FIRST);
    expect(pipe(outcomes, Arr.filter(differs))).toStrictEqual([]);
  }).pipe(services.runPromise));
