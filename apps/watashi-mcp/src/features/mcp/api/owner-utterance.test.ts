import { Array as Arr } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { ownerUtterances } from "./owner-utterance";

const AT = "2026-11-09T15:19:34.000Z";

const user = (uuid: string, content: string, extra = ""): string =>
  `{"type":"user","uuid":"${uuid}","timestamp":"${AT}",${extra}"message":{"role":"user","content":${content}}}`;

const said = (jsonl: string): readonly string[] =>
  Arr.map(ownerUtterances(jsonl), (utterance) => utterance.text);

const lines = (...rows: readonly string[]): string => Arr.join(rows, "\n");

describe("本人の発言の取り出し", () => {
  it("手元で打った発言を取り出す", () => {
    expect(said(`${user("u1", '"テストを足して"')}\n`)).toStrictEqual(["テストを足して"]);
    expect(
      said(user("u2", '[{"type":"text","text":"画像も見て"},{"type":"image","source":{}}]')),
    ).toStrictEqual(["画像も見て"]);
  });

  it("uuid と時刻を添える", () => {
    const line = user("u1", '"はい"');
    expect(ownerUtterances(line)).toStrictEqual([{ uuid: "u1", timestamp: AT, text: "はい" }]);
  });

  it("ツールの結果・メタ・subagent への指示・要約・AI の発言を除く", () => {
    const transcript = lines(
      user("t", '[{"type":"tool_result","tool_use_id":"toolu_1","content":"ok"}]'),
      user("m", '"<session-context>…</session-context>"', '"isMeta":true,'),
      user("s", '"調べて"', '"isSidechain":true,'),
      user("c", '"This session is being continued"', '"isCompactSummary":true,'),
      `{"type":"assistant","uuid":"a","timestamp":"${AT}","message":{"content":"了解"}}`,
      user("o", '"<local-command-stdout>done</local-command-stdout>"'),
      "{broken",
    );
    expect(said(transcript)).toStrictEqual([]);
  });

  it("system-reminder を落とす", () => {
    expect(
      said(user("u", String.raw`"<system-reminder>hook</system-reminder>\n直して"`)),
    ).toStrictEqual(["直して"]);
  });
});

describe("プロジェクトの wake からの本人の発言の取り出し", () => {
  it("人の発言と引用された本人の発言だけを取り出す", () => {
    const wake = [
      String.raw`"<wake reason=\"mention\"><project><thread>\n`,
      String.raw`<message trigger=\"true\" from=\"human\" trust=\"principal\" id=\"cmsg_1\">日本語にして &amp; &lt;急ぎ&gt;</message>\n`,
      String.raw`</thread></project></wake>\n<coordinator-relay><relay from=\"coordinator\">`,
      String.raw`<cited id=\"cmsg_2\" author=\"user\" name=\"masseater\">取り込むのは発言だけ</cited>`,
      String.raw`<note>コーディネーターの言葉</note></relay></coordinator-relay>"`,
    ];
    const line = user("w", Arr.join(wake, ""));
    expect(said(line)).toStrictEqual(["日本語にして & <急ぎ>", "取り込むのは発言だけ"]);
  });

  it("人の発言の無い wake は何も返さない", () => {
    const wake = String.raw`"<wake reason=\"task-notification\"><message from=\"agent\">done</message></wake>"`;
    expect(said(user("w", wake))).toStrictEqual([]);
  });
});
