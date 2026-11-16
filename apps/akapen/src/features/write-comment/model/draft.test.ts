import { describe, expect, it } from "@effect/vitest";
import { AtomRegistry } from "effect/reactivity";

import { wordsAtom } from "./draft.ts";

const WORDS = "ここの間を詰めて";

describe("wordsAtom", () => {
  it("keeps the draft in the screen's storage", () => {
    const registry = AtomRegistry.make();
    registry.mount(wordsAtom);
    registry.set(wordsAtom, WORDS);
    const fresh = AtomRegistry.make();
    expect(fresh.get(wordsAtom)).toBe(WORDS);
  });
});
