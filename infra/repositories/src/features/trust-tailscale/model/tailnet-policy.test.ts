import { parse } from "jsonc-parser";
import { expect, test } from "vite-plus/test";

import { ensureEntries, removeEntries, replaceEntries } from "./tailnet-policy.ts";

const GRANT = { src: ["tag:agent"], dst: ["autogroup:member"], ip: ["tcp:22"] };

const ENTRIES = { tagOwners: { "tag:agent": ["autogroup:admin"] }, grants: [GRANT] };

const POLICY = `{
  // 持ち主が書いたコメント
  "tagOwners": {
    "tag:server": ["autogroup:admin"],
  },
  "grants": [
    {"src": ["autogroup:member"], "dst": ["autogroup:self"], "ip": ["*"]},
  ],
}
`;

test("足りない tagOwners と grants だけを足し、既存の行とコメントを残す", () => {
  const ensured = ensureEntries(ENTRIES)(POLICY);
  expect(ensured).toContain("// 持ち主が書いたコメント");
  expect(parse(ensured)).toStrictEqual({
    tagOwners: { "tag:server": ["autogroup:admin"], "tag:agent": ["autogroup:admin"] },
    grants: [{ src: ["autogroup:member"], dst: ["autogroup:self"], ip: ["*"] }, GRANT],
  });
});

test("2 回目は何も変えない", () => {
  const ensured = ensureEntries(ENTRIES)(POLICY);
  expect(ensureEntries(ENTRIES)(ensured)).toBe(ensured);
});

test("grants の無い方針には grants を作る", () => {
  expect(parse(ensureEntries(ENTRIES)("{}"))).toStrictEqual({
    tagOwners: { "tag:agent": ["autogroup:admin"] },
    grants: [GRANT],
  });
});

test("消すときは足したものだけを外す", () => {
  const removed = removeEntries(ENTRIES)(ensureEntries(ENTRIES)(POLICY));
  expect(parse(removed)).toStrictEqual(parse(POLICY));
});

test("前に足した grant を新しい grant に差し替える", () => {
  const narrowed = { ...ENTRIES, grants: [{ ...GRANT, dst: ["100.64.0.1"] }] };
  const replaced = replaceEntries(ENTRIES)(narrowed)(ensureEntries(ENTRIES)(POLICY));
  expect(parse(replaced)).toStrictEqual(parse(ensureEntries(narrowed)(POLICY)));
});
