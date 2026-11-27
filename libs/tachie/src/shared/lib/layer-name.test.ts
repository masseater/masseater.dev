import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import {
  decodeLayerName,
  decodeStateValue,
  encodeLayerName,
  normalizeLayerPath,
} from "./layer-name.ts";

const base64Url = (text: string): string =>
  new TextEncoder().encode(text).toBase64({ alphabet: "base64url", omitPadding: true });

describe("layer names", () => {
  it("escapes the characters a layer path cannot hold", () => {
    expect(encodeLayerName("目/口 %~")).toBe("目%2f口%20%25%7e");
  });

  it("decodes an escaped segment back to its name", () => {
    expect(decodeLayerName("目%2f口")).toStrictEqual(Option.some("目/口"));
  });

  it("rejects a broken escape", () => {
    expect(decodeLayerName("%zz")).toStrictEqual(Option.none());
  });

  it("normalizes the escapes of a whole path", () => {
    expect(normalizeLayerPath("%e7%9c%89/%2A%e5%9b%b0%e3%82%8a")).toStrictEqual(
      Option.some("眉/*困り"),
    );
  });
});

describe("state values", () => {
  it("reads escaped text with a backslash escape", () => {
    expect(decodeStateValue(".眉/飾り%y1")).toStrictEqual(Option.some(String.raw`眉/飾り\1`));
  });

  it("reads base64url text", () => {
    expect(decodeStateValue(`_${base64Url("眉/*困り")}`)).toStrictEqual(Option.some("眉/*困り"));
  });

  it("rejects an unknown prefix", () => {
    expect(decodeStateValue("?abc")).toStrictEqual(Option.none());
  });
});
