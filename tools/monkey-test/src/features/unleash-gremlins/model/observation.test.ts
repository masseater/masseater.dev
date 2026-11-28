import { Array as Arr, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { lineOf } from "#/entities/finding/index.ts";

import { findingsOfObservations } from "./observation.ts";
import type { Observation } from "./observation.ts";

const linesOf = (observations: readonly Observation[]): readonly string[] =>
  pipe(
    findingsOfObservations({ surface: "page", target: "https://example.test/", observations }),
    Arr.map((found) => lineOf(found)),
  );

describe("findingsOfObservations", () => {
  it("reports an error that appears only under the monkey", () => {
    expect(
      linesOf([{ phase: "monkey", source: "error", text: "TypeError: x is undefined" }]),
    ).toStrictEqual(["page-error https://example.test/ TypeError: x is undefined"]);
  });

  it("drops what the page already did while it loaded, however the digits differ", () => {
    expect(
      linesOf([
        { phase: "load", source: "error", text: "timeout after 30 ms" },
        { phase: "monkey", source: "error", text: "timeout after 95 ms" },
      ]),
    ).toStrictEqual([]);
  });

  it("ignores a failed resource, which the server error covers", () => {
    expect(
      linesOf([{ phase: "monkey", source: "error", text: "Failed to load resource: 500" }]),
    ).toStrictEqual([]);
  });

  it("reports a server error and counts a repeat once", () => {
    expect(
      linesOf([
        { phase: "monkey", source: "server-error", text: "500 https://example.test/api?q=1" },
        { phase: "monkey", source: "server-error", text: "500 https://example.test/api?q=2" },
      ]),
    ).toStrictEqual(["page-server-error https://example.test/ 500 https://example.test/api?q=1"]);
  });
});
