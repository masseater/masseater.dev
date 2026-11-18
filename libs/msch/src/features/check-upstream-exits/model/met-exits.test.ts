import { Array as Arr, Option, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { parseCondition } from "./exit-condition.ts";
import type { ExitCondition } from "./exit-condition.ts";
import { isMet } from "./met-exits.ts";
import type { Release } from "./met-exits.ts";

const RELEASE: Release = {
  versions: ["0.70.0", "0.71.0", "1.0.0-beta.1"],
  latestDependencies: {
    typescript: "^5.9.3",
    workerd: "1.20261120.1",
    "vscode-languageserver": "~11.0.0",
  },
};

const anyMet = (conditions: readonly ExitCondition[]): boolean =>
  pipe(conditions, Arr.some(isMet(RELEASE)));

const met = (text: string): boolean => pipe(parseCondition(text), Option.exists(anyMet));

describe("isMet", () => {
  it("checks published versions against the range", () => {
    expect(met("npm:pkg@>0.70.0")).toBe(true);
    expect(met("npm:pkg@>=2")).toBe(false);
    expect(met("npm:pkg@>=0.72.0")).toBe(false);
    expect(met("npm:pkg@>=1.0.0-beta.0")).toBe(true);
  });

  it("checks what the latest version declares", () => {
    expect(met("npm:pkg drops typescript")).toBe(false);
    expect(met("npm:pkg drops capnp-es")).toBe(true);
    expect(met("npm:pkg allows typescript@>=7")).toBe(false);
    expect(met("npm:pkg allows vscode-languageserver@>=11")).toBe(true);
    expect(met("npm:pkg requires workerd@>=1.20261115.1")).toBe(true);
    expect(met("npm:pkg requires workerd@>=1.20261201.1")).toBe(false);
  });

  it("leaves issues and unused overrides to their own lookups", () => {
    expect(met("github:owner/repo#1")).toBe(false);
    expect(met("unused")).toBe(false);
  });
});
