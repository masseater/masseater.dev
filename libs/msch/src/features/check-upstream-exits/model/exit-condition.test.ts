import { Array as Arr, Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { describeCondition, exitTextOf, parseCondition } from "./exit-condition.ts";

const described = (text: string): readonly string[] | "invalid" =>
  Option.match(parseCondition(text), {
    onNone: () => "invalid" as const,
    onSome: Arr.map(describeCondition),
  });

describe("parseCondition", () => {
  it("reads every condition form", () => {
    expect(described("unused")).toStrictEqual(["unused"]);
    expect(described("npm:@tanstack/intent@>0.5.6")).toStrictEqual(["npm:@tanstack/intent@>0.5.6"]);
    expect(described("npm:capnp-es drops typescript")).toStrictEqual([
      "npm:capnp-es drops typescript",
    ]);
    expect(described("npm:langium allows vscode-languageserver@>=11")).toStrictEqual([
      "npm:langium allows vscode-languageserver@>=11",
    ]);
    expect(described("crate:tao requires gtk@>=0.19")).toStrictEqual([
      "crate:tao requires gtk@>=0.19",
    ]);
    expect(described("github:owner/repo#12 || npm:pkg@>1.0.0")).toStrictEqual([
      "github:owner/repo#12",
      "npm:pkg@>1.0.0",
    ]);
  });

  it("rejects prose and malformed conditions", () => {
    expect(described("when upstream fixes it")).toBe("invalid");
    expect(described("npm:pkg@not a range")).toBe("invalid");
    expect(described("npm:pkg allows dep")).toBe("invalid");
    expect(described("npm:pkg drops dep@1")).toBe("invalid");
    expect(described("github:owner/repo#0")).toBe("invalid");
    expect(described("unused || later")).toBe("invalid");
  });
});

describe("exitTextOf", () => {
  it("reads the condition from a comment with or without the hash", () => {
    expect(exitTextOf("# exit: unused")).toStrictEqual(Option.some("unused"));
    expect(exitTextOf(" exit: npm:pkg@>1")).toStrictEqual(Option.some("npm:pkg@>1"));
    expect(exitTextOf("# pinned for now")).toStrictEqual(Option.none());
  });
});
