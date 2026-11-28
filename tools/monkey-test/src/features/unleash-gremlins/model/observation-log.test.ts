import { describe, expect, it } from "vite-plus/test";

import { observationsOf } from "./observation-log.ts";

describe("observationsOf", () => {
  it("labels each event with the phase the last marker set", () => {
    expect(
      observationsOf([
        { _tag: "event", source: "error", text: "early" },
        { _tag: "phase", phase: "monkey" },
        { _tag: "event", source: "error", text: "during" },
        { _tag: "phase", phase: "load" },
        { _tag: "event", source: "server-error", text: "after navigation" },
      ]),
    ).toStrictEqual([
      { phase: "load", source: "error", text: "early" },
      { phase: "monkey", source: "error", text: "during" },
      { phase: "load", source: "server-error", text: "after navigation" },
    ]);
  });
});
