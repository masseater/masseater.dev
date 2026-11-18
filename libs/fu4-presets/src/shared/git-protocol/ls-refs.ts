import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import { decodePackets, encodePackets } from "./pkt-line.ts";
import type { Packet } from "./pkt-line.ts";

export interface RemoteRef {
  readonly name: string;
  readonly oid: string;
}

const LINE = /^(?<oid>[0-9a-f]{40}) (?<name>\S+)(?: peeled:(?<peeled>[0-9a-f]{40}))?$/u;
const NEWLINE = "\n";
const START = 0;

const data = (text: string): Packet => ({ type: "data", data: text });

export const lsRefsRequest = (agent: string): Uint8Array =>
  encodePackets([
    data("command=ls-refs\n"),
    data(`agent=${agent}\n`),
    { type: "delim" },
    data("peel\n"),
    data("ref-prefix refs/heads/\n"),
    data("ref-prefix refs/tags/\n"),
    { type: "flush" },
  ]);

const withoutNewline = (line: string): string => {
  if (Str.endsWith(NEWLINE)(line)) {
    return Str.slice(START, line.length - NEWLINE.length)(line);
  }
  return line;
};

const refOf = (line: string): Result.Result<RemoteRef, string> =>
  pipe(
    Option.fromNullishOr(LINE.exec(line)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(({ oid, name, peeled }) =>
      Option.map(
        Option.all([Option.fromNullishOr(oid), Option.fromNullishOr(name)]),
        ([id, ref]) => ({
          name: ref,
          oid: peeled ?? id,
        }),
      ),
    ),
    Result.fromOption(() => `malformed line ref: ${line}`),
  );

const lineRefOf = (packet: Packet): Result.Result<RemoteRef, string> => {
  if (packet.type !== "data") {
    return Result.fail(`unexpected ${packet.type} packet`);
  }
  return refOf(withoutNewline(packet.data));
};

export const parseLsRefs = (bytes: Uint8Array): Result.Result<readonly RemoteRef[], string> =>
  Result.flatMap(decodePackets(bytes), (packets) =>
    pipe(
      packets,
      Arr.takeWhile((packet) => packet.type !== "flush"),
      Arr.map(lineRefOf),
      Result.all,
    ),
  );
