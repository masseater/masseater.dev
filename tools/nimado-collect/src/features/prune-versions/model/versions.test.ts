import { Array as Arr, pipe } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { expiredVersions } from "./versions.ts";

const CUTOFF = "2026-02-01T00:00:00.000Z";
const BEFORE = "2026-01-31T23:59:59.999Z";
const LONG_BEFORE = "2026-01-01T00:00:00.000Z";
const AFTER = "2026-02-02T00:00:00.000Z";

type Version = Readonly<{ id: string; createdOn: string }>;

const version = (id: string, createdOn: string): Version => ({
  id,
  createdOn,
});

const CASES: readonly Readonly<{
  title: string;
  versions: readonly Version[];
  expired: readonly string[];
}>[] = [
  {
    title: "期限より古い版を消す対象にする",
    versions: [version("new", AFTER), version("old", BEFORE), version("older", LONG_BEFORE)],
    expired: ["old", "older"],
  },
  {
    title: "期限ちょうどの版と期限より新しい版を残す",
    versions: [version("new", AFTER), version("edge", CUTOFF)],
    expired: [],
  },
  {
    title: "いちばん新しい版は、期限より古くても残す",
    versions: [version("older", LONG_BEFORE), version("old", BEFORE)],
    expired: ["older"],
  },
  {
    title: "版が 1 つだけなら、期限より古くても残す",
    versions: [version("older", LONG_BEFORE)],
    expired: [],
  },
  {
    title: "版が無ければ、何も消さない",
    versions: [],
    expired: [],
  },
  {
    title: "並びが作成順でなくても、作成日で選ぶ",
    versions: [version("older", LONG_BEFORE), version("new", AFTER), version("old", BEFORE)],
    expired: ["old", "older"],
  },
];

describe("expiredVersions", () => {
  it.each(CASES)("$title", ({ versions, expired }) => {
    const ids = pipe(
      expiredVersions({ versions, cutoff: CUTOFF }),
      Arr.map(({ id }) => id),
    );
    expect(ids).toStrictEqual(expired);
  });
});
