import { Result } from "effect";
import { expect, test } from "vite-plus/test";

import { decodePackets, encodePackets, lsRefsRequest, parseLsRefs } from "./index.ts";
import type { Packet } from "./index.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const LS_REFS = `0032ac7cfa9fb7b5d6c417847e49e375aae20819a06f HEAD
003dac7cfa9fb7b5d6c417847e49e375aae20819a06f refs/heads/main
006a1accca34bff60347d96faaf713d328ca1250d37b refs/tags/v1 peeled:3fdd4fca8fc76b254cefefca92381c41b28d1f0d
0000`;

const decodedText = (text: string): Result.Result<readonly Packet[], string> =>
  decodePackets(encoder.encode(text));

const fails = (text: string): boolean => Result.isFailure(decodedText(text));

test("encodes data, delimiter and flush packets", () => {
  const bytes = encodePackets([
    { type: "data", data: "peel\n" },
    { type: "delim" },
    { type: "flush" },
  ]);
  expect(decoder.decode(bytes)).toBe("0009peel\n00010000");
});

test("round-trips packets", () => {
  const packets: readonly Packet[] = [
    { type: "data", data: "a\n" },
    { type: "delim" },
    { type: "flush" },
  ];
  const bytes = encodePackets(packets);
  expect(Result.getOrThrow(decodePackets(bytes))).toEqual(packets);
});

test("rejects malformed packets", () => {
  expect(fails("zzzz")).toBe(true);
  expect(fails("0002")).toBe(true);
  expect(fails("0010abc")).toBe(true);
  expect(decodedText("0009ERR x")).toEqual(Result.fail("in-band error: x"));
});

test("asks for heads and tags with peeled objects", () => {
  const text = decoder.decode(lsRefsRequest("agent"));
  expect(text).toContain("command=ls-refs\n");
  expect(text).toContain("peel\n");
  expect(text).toContain("ref-prefix refs/tags/\n");
});

test("parses ls-refs lines and prefers peeled object ids", () => {
  const parsed = parseLsRefs(encoder.encode(LS_REFS));
  expect(Result.getOrThrow(parsed)).toEqual([
    { name: "HEAD", oid: "ac7cfa9fb7b5d6c417847e49e375aae20819a06f" },
    { name: "refs/heads/main", oid: "ac7cfa9fb7b5d6c417847e49e375aae20819a06f" },
    { name: "refs/tags/v1", oid: "3fdd4fca8fc76b254cefefca92381c41b28d1f0d" },
  ]);
});

test("rejects a malformed ref line", () => {
  const bytes = encodePackets([{ type: "data", data: "nope\n" }]);
  expect(Result.isFailure(parseLsRefs(bytes))).toBe(true);
});
