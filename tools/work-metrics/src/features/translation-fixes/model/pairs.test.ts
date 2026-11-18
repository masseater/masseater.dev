import { expect, it } from "vite-plus/test";

import { pairsOf } from "./pairs.ts";

it("PLaMo の生の訳と、その次の手直しのコミットを組にする", () => {
  expect(
    pairsOf([
      { sha: "en", subject: "docs(blog): 英語の原文を書く", merge: false },
      { sha: "raw", subject: "docs(blog): PLaMo で訳した日本語に置き換える", merge: false },
      { sha: "main", subject: "Merge branch 'main' into x", merge: true },
      { sha: "fix", subject: "docs(blog): PLaMo の訳の誤訳を直す", merge: false },
    ]),
  ).toStrictEqual([{ raw: "raw", fix: "fix" }]);
});

it("手直しのコミットが無い訳は数えない", () => {
  expect(
    pairsOf([
      {
        sha: "raw",
        subject: "docs: 2 本の記事を PLaMo で訳した出力をそのまま入れる",
        merge: false,
      },
    ]),
  ).toStrictEqual([]);
});

it("訳の次のコミットが手直しでなければ数えない", () => {
  expect(
    pairsOf([
      { sha: "raw", subject: "docs: PLaMo で訳した日本語に置き換える", merge: false },
      { sha: "grow", subject: "docs: 記事を約 230 件の一覧に広げる", merge: false },
    ]),
  ).toStrictEqual([]);
});
