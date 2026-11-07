import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";

import { searchViewOf } from "./search-view.ts";

const RESULT = {
  assetId: 1,
  guid: "guid",
  pathname: "Assets/cat.png",
  kind: "texture",
  packageId: 1,
  packageName: "Cats",
  packageKind: "unitypackage",
  score: 0.8,
  hasPreview: true,
  analyzing: false,
  file: Option.getOrNull(Option.none<string>()),
} as const;

describe("searchViewOf", () => {
  it("shows nothing before anything is searched", () => {
    const view = searchViewOf({ phase: "idle", failure: Option.none(), results: Option.none() });
    expect(view).toStrictEqual({ status: "idle" });
  });

  it("shows the failure message", () => {
    const view = searchViewOf({
      phase: "settled",
      failure: Option.some("接続できません"),
      results: Option.none(),
    });
    expect(view).toStrictEqual({
      status: "message",
      text: "接続できません",
      tone: "error",
    });
  });

  it("waits while searching", () => {
    const view = searchViewOf({
      phase: "searching",
      failure: Option.none(),
      results: Option.none(),
    });
    expect(view).toMatchObject({ status: "message", tone: "muted" });
  });

  it("shows an empty result as no matches", () => {
    const view = searchViewOf({
      phase: "settled",
      failure: Option.none(),
      results: Option.some([]),
    });
    expect(view).toStrictEqual({ status: "results", matches: [], others: [] });
  });
});

describe("searchViewOf with results", () => {
  it("separates close matches from weak candidates", () => {
    const weak = { ...RESULT, assetId: 2, score: 0.65 };
    const view = searchViewOf({
      phase: "settled",
      failure: Option.none(),
      results: Option.some([RESULT, weak]),
    });
    expect(view).toStrictEqual({ status: "results", matches: [RESULT], others: [weak] });
  });

  it("keeps only weak candidates when nothing is close", () => {
    const weak = { ...RESULT, score: 0.65 };
    const view = searchViewOf({
      phase: "settled",
      failure: Option.none(),
      results: Option.some([weak]),
    });
    expect(view).toStrictEqual({ status: "results", matches: [], others: [weak] });
  });
});
