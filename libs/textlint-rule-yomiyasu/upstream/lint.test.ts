// nanaism/yomiyasu の tests/ のうち、warn と error の規則を確かめる例を写したもの。
import { describe, expect, test } from "vite-plus/test";

import bold from "./fixtures/bold_regressions.json" with { type: "json" };
import { lintText } from "./lint.ts";

const rules = (text: string): string[] => lintText(text).map((finding) => finding.rule);
const hits = (text: string, rule: string) => lintText(text).filter((finding) => finding.rule === rule);
const dashRules = (text: string): string[] => rules(text).filter((rule) => rule.startsWith("dash_"));
const KIKU = "比喩動詞「効く」の過剰使用";
const kikuHits = (text: string) => hits(text, "metaphor_verb").filter((finding) => finding.message.startsWith(KIKU));

describe("dash", () => {
  test.each([
    ["重要な機能――とりわけ認証周り――は慎重に。\n", ["dash_insertion"]],
    ["設定を更新しました — 再起動してください。\n", ["dash_decoration"]],
    ["速さ、軽さ、静けさ──。\n", ["dash_list_ending"]],
    ["設計、実装、検証—。\n", ["dash_list_ending"]],
    ["- 速さ、軽さ、静けさ━━\n", ["dash_list_ending"]],
    ["A――B――C――D。\n", ["dash_insertion"]],
    ["記号「—」の後で、設定を変えました——念のため。\n", ["dash_decoration"]],
    ["[記事](https://example.com/a)を読みました——とても参考になります。\n", ["dash_decoration"]],
    ["## 設計 — 実装\n", ["dash_decoration"]],
    ["今日——正確には昨日——連絡しました。\n", ["dash_insertion"]],
    ["AIの仕事—人間の役割は変わる。", ["dash_decoration"]],
    ["大事なのは集中—時間の使い方が変わる。", ["dash_decoration"]],
    ["この経験—目線が変わった。", ["dash_decoration"]],
    ["判断—作業時間を短くした。", ["dash_decoration"]],
    ["—— ここからが本題", ["dash_decoration"]],
    ["——そう、これが答えだ", ["dash_decoration"]],
    ["— 速度が2倍になった", ["dash_decoration"]],
    ["「その——「普通」っていうのが分からない」——そう言った。", ["dash_decoration"]],
    ["『作品名』を読みました——参考になりました。", ["dash_decoration"]],
    ["―― 夏目漱石『こころ』を読みました——参考になりました。", ["dash_insertion"]],
    ["— Martin Fowler, Refactoring — 読みました。", ["dash_decoration"]],
    ["設計、実装、検証 ──。", ["dash_list_ending"]],
    ["設計、 実装、 検証　──。", ["dash_list_ending"]],
    ["- 設計、実装、検証 ──", ["dash_list_ending"]],
    ["彼は、振り返った——", ["dash_decoration"]],
    ["サーバーの設定をコピーしました。\n", []],
    ["対象は1–3章です。\n", []],
    ["10時〜12時に作業します。\n", []],
    ["前半と後半を分けます。\n\n---\n\n後半です。\n", []],
    ["```text\nsrc/\n├── main.py\n└── util.py\n──────\n```\n", []],
    ["値は `a—b` の形式で渡します。\n", []],
    ["| 項目 | 値 |\n|---|---|\n| 備考 | — |\n", []],
    ["> 彼は言った――もう遅い、と。\n", []],
    ["src/\n├── main.py\n└── util.py\n", []],
    ["──────────\n", []],
    ["「もう遅い――」と彼は言った。\n", []],
    ["記号「—」と「──」は使いません。\n", []],
    ["- [記事の題名](https://example.com/a) — 著者氏\n", []],
    ["- [生成AIの平易化―やさしい日本語―](https://example.com/b), 論文誌\n", []],
    ["東京―大阪間の運賃です。", []],
    ["東京―大阪線を利用します。", []],
    ["東京―大阪便に乗ります。", []],
    ["津―堺間の距離です。", []],
    ["東京―大阪区間を調べます。", []],
    ["東京―大阪線運休のお知らせ", []],
    ["東京―大阪間直通列車に乗ります。", []],
    ["―― 夏目漱石『こころ』", []],
    ["―― ピーター・F・ドラッカー『マネジメント』（上田惇生訳、ダイヤモンド社、2001年）", []],
    ["> Stay hungry, stay foolish.\n\n― Steve Jobs, Stanford Commencement Address, 2005", []],
    ["> 引用文。\n\n— Albert Einstein, letter to Max Born, 1926", []],
    ["— Martin Fowler, *Refactoring*, 2nd ed., 2018", []],
    ["―― 出典：調査報告書（2025年）", []],
    ["「その——「普通」っていうのが、私には分からない」", []],
    ["『彼は「待って——」と言った』", []],
    ["「半角の[を入力して——」と説明した。", []],
    ["『開きかっこ「を入力——』と説明した。", []],
  ])("%j", (text, expected) => {
    expect(dashRules(text)).toEqual(expected);
  });

  test("caps dash findings at three per document", () => {
    const text = [1, 2, 3, 4, 5, 6].map((n) => `${n}行目です——念のため。\n`).join("");
    expect(dashRules(text)).toHaveLength(3);
  });

  test("finishes long nouns and nested quotes", () => {
    for (const text of [
      `${"漢".repeat(100_000)}—`,
      `${"漢".repeat(100_000)}—大阪間`,
      `作業—${"人間".repeat(50_000)}`,
      `${"「".repeat(20_000)}待って——${"」".repeat(20_000)}`,
    ]) {
      const started = performance.now();
      lintText(text);
      expect(performance.now() - started).toBeLessThan(3000);
    }
  });
});

describe("vocabulary", () => {
  test.each([
    ["依存の閉包を取ってから実行します。\n", "slop_vocabulary", "閉包"],
    ["レビューゲートを通してから公開します。\n", "slop_vocabulary", "ゲート"],
    ["変更は作業台帳に記録します。\n", "slop_vocabulary", "台帳"],
    ["これは思考のOSです。\n", "slop_vocabulary", "OS"],
    ["組織OSを作ります。\n", "slop_vocabulary", "OS"],
    ["その言語化は、かなり本質を突いています。\n", "slop_vocabulary", "本質を突"],
    ["この版では読み込みを速くしました。\n", "translated_term", "版"],
    ["新しい版で設定の形式が変わりました。\n", "translated_term", "版"],
    ["版を上げる前に確認します。\n", "translated_term", "版"],
    ["前回のリリースで回帰が出ました。\n", "translated_term", "回帰"],
    ["この変更が回帰を起こしました。\n", "translated_term", "回帰"],
    ["回帰が発生したので戻しました。\n", "translated_term", "回帰"],
  ])("%j is a %s candidate", (text, rule, word) => {
    const found = hits(text, rule);
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]?.message).toContain(word);
    expect(found[0]?.severity).toBe("warn");
  });

  test.each([
    ["APIゲートウェイの設定を変えました。\n", "slop_vocabulary"],
    ["依存グラフの推移閉包を求めます。\n", "slop_vocabulary"],
    ["固定資産台帳を更新しました。\n", "slop_vocabulary"],
    ["会計の台帳は経理が管理しています。\n", "slop_vocabulary"],
    ["iOSとmacOSで確認しました。\n", "slop_vocabulary"],
    ["社内のOSを更新します。\n", "slop_vocabulary"],
    ["日本語版を公開しました。\n", "translated_term"],
    ["第2版で章を追加しました。\n", "translated_term"],
    ["無料版と有料版があります。\n", "translated_term"],
    ["改訂版を配布します。\n", "translated_term"],
    ["回帰テストを追加しました。\n", "translated_term"],
    ["線形回帰で予測します。\n", "translated_term"],
    ["回帰分析の結果です。\n", "translated_term"],
    ["原点に回帰する設計です。\n", "translated_term"],
  ])("%j has no %s", (text, rule) => {
    expect(rules(text)).not.toContain(rule);
  });
});

describe("meta_filler", () => {
  test.each([
    "前置きです。結論から言うと、完了します。\n",
    "設定です。ここで重要なのは、順序です。\n",
    "結論から言うね。それ、正解。\n",
    "結論から言います。\n",
    "結論からいえば、採用しません。\n",
    "結論から申し上げますと、延期します。\n",
    "大切なのは、続けることです。\n",
    "大事なのは、順序です。\n",
    "ポイントは、設定を先に読むことです。\n",
    "ここが一番見落とされがちなポイントです。\n",
    "まさにそこがポイントです。\n",
    "本音を言うと、迷っています。\n",
    "お役に立てれば幸いです。\n",
    "ぜひご活用ください。\n",
    "まずは小さく始めましょう。\n",
    "ご質問ありがとうございます。\n",
    "それでは見ていきましょう。\n",
    "この仕組みを深掘りしていきます。\n",
    "必要なら次に、運用手順まで落とし込みます。\n",
    "ご希望があれば、続けて例を用意します。\n",
    "見ていきましょう🚀！\n",
    "これは最高だと言っても過言ではありません。\n",
  ])("%j", (text) => {
    const found = hits(text, "meta_filler");
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((finding) => finding.severity === "warn")).toBe(true);
  });

  test("counts closings sentence by sentence", () => {
    expect(hits("以上です。いかがでしたか？参考になれば幸いです。\n", "meta_filler")).toHaveLength(2);
  });

  test.each(["この順序が重要なのは、設定を先に読むからです。\n", "ご確認いただけると幸いです。\n", "「言っても過言ではありません」という言い方。\n"])(
    "%j is kept",
    (text) => {
      expect(rules(text)).not.toContain("meta_filler");
    },
  );
});

describe("heading_colon", () => {
  test("flags 「Xとは：Y」", () => {
    expect(hits("## uvとは：仕組みと使い方\n", "heading_colon")).toHaveLength(1);
    expect(rules("## 障害報告書：決済の遅延\n")).not.toContain("heading_colon");
  });
});

describe("sentence_end_repetition", () => {
  const repetitions = (text: string) =>
    hits(text, "sentence_end_repetition").map((finding) => [finding.line, finding.snippet] as const);

  test.each([
    "# 起動手順\n\n設定ファイルを読みます。\n\n次にサーバーを起動します。\n\n最後に画面を確認します。",
    "設定を読みます。起動します。\n\n画面を確認します。",
    "設定を読みます。起動します。\r\n\r\n画面を確認します。",
    "設定を読みます。起動します。\n \t\n画面を確認します。",
    "設定を読みます。起動します。\n## 次の手順\n画面を確認します。",
    "設定を読みます。起動します。\n- 確認する項目\n画面を確認します。",
    "設定を読みます。起動します。\n1. 確認する項目\n画面を確認します。",
    "設定を読みます。起動します。\n> 参照する説明\n画面を確認します。",
    "設定を読みます。起動します。\n| 確認項目 |\n画面を確認します。",
    "設定を読みます。起動します。\n<div>説明</div>\n画面を確認します。",
    "設定を読みます。起動します。\n![説明](sample.png)\n画面を確認します。",
    "設定を読みます。起動します。\n```text\nコード例です。\n```\n画面を確認します。",
    "設定を読みます。起動します。\n\n    コード例です。\n\n画面を確認します。",
    "設定を読みます。起動します。準備は完了です。画面を確認します。終了します。",
    "---\ndescription: 設定を読みます。起動します。画面を確認します。\n---",
    "```text\n設定を読みます。起動します。画面を確認します。\n```",
    "~~~text\n設定を読みます。起動します。画面を確認します。\n~~~",
    "````text\n```\n設定を読みます。起動します。画面を確認します。\n````",
    "```text\n~~~\n設定を読みます。起動します。画面を確認します。\n```",
    "```text\n```not-a-closer\n設定を読みます。起動します。画面を確認します。\n```",
    "```text\n設定を読みます。起動します。画面を確認します。",
    "設定を読みます。\n\n起動します。\n\n画面を確認します。",
  ])("%j has no run", (text) => {
    expect(repetitions(text)).toEqual([]);
  });

  test.each([
    ["設定を読みます。起動します。画面を確認します。", [[1, "画面を確認します。"]]],
    ["設定を読みます。\n起動します。\n画面を確認します。", [[3, "画面を確認します。"]]],
    ["設定を読みます。\r\n起動します。\r\n画面を確認します。", [[3, "画面を確認します。"]]],
    ["設定を読みます。起動します。\n\n画面を確認します。\n終了します。\n結果を記録します。", [[5, "結果を記録します。"]]],
    [
      "設定を読みます。起動します。画面を確認します。\n\n結果を記録します。終了します。画面を閉じます。",
      [
        [1, "画面を確認します。"],
        [3, "画面を閉じます。"],
      ],
    ],
    ["設定を読みます。起動します。画面を確認します。終了します。", [[1, "画面を確認します。"]]],
    [
      "---\ndescription: 設定を読みます。起動します。画面を確認します。\n---\n\n設定を読みます。\n起動します。\n画面を確認します。",
      [[7, "画面を確認します。"]],
    ],
    ["```text\nコード例です。\n```\n設定を読みます。\n起動します。\n画面を確認します。", [[6, "画面を確認します。"]]],
    ["~~~text\nコード例です。\n~~~\n設定を読みます。\n起動します。\n画面を確認します。", [[6, "画面を確認します。"]]],
    ["````text\nコード例です。\n`````\n設定を読みます。\n起動します。\n画面を確認します。", [[6, "画面を確認します。"]]],
    [
      "```text\r\nコード例です。\r\n``` \t\r\n設定を読みます。\r\n起動します。\r\n画面を確認します。",
      [[6, "画面を確認します。"]],
    ],
    ["これは有効でしょう。あれも有効でしょう。それも有効でしょう。\n", [[1, "それも有効でしょう。"]]],
    ["速いですね。軽いですね。安いですね。\n", [[1, "安いですね。"]]],
  ])("%j", (text, expected) => {
    expect(repetitions(text)).toEqual(expected);
  });

  test("keeps the original snippet around long inline code", () => {
    const sentence = `本文\`${"code".repeat(5000)}\`です。`;
    expect(repetitions([sentence, sentence, sentence].join("\n"))).toEqual([[3, sentence]]);
  });

  test("reads the ending before masked code", () => {
    for (const length of [100, 20000]) {
      for (const prefix of ["本文", "本文です"]) {
        const sentence = `${prefix}\`${"x".repeat(length)}\`。`;
        const expected = prefix.endsWith("です") ? [[3, sentence]] : [];
        expect(repetitions([sentence, sentence, sentence].join("\n"))).toEqual(expected);
      }
    }
  });
});

describe("trailing_colon", () => {
  test.each([
    "- 場所：`.github/workflows/test.yml`",
    "- 場所: `.github/workflows/test.yml`",
    "- 場所： `.github/workflows/test.yml`",
    "- 場所：設定ファイル",
    "- 値：` `",
    "- 値：``",
    "- 値：``key:value``",
    "- 値：``a`b``",
    "- 値：```key:value```",
    "`key:value`",
    "値は`value:`",
    "値は``value:``",
    "値は``a`b:``",
    "https://example.com/endpoint:",
    "`参考`https://example.com/endpoint:",
    ":::details 詳細\n本文です。\n:::",
    ":::message\n本文です。\n:::",
    "::::details 外側\n:::message\n本文です。\n:::\n::::",
    "---\ntitle: サンプル:\n---\n> 引用：\n| 値： |\n<aside>見出し：</aside>\n```yaml\nkey:\n```\n~~~yaml\nanother:\n~~~\n",
  ])("%j has no trailing colon", (text) => {
    expect(rules(text)).not.toContain("trailing_colon");
  });

  test.each([
    ["確認事項：", "確認事項："],
    ["確認事項:", "確認事項:"],
    ["値は`value`：", "値は`value`："],
    ["値は`value:`:", "値は`value:`:"],
    ["値は``a`b``：", "値は``a`b``："],
    ["値は`key:", "値は`key:"],
    ["確認事項：  ", "確認事項："],
  ])("%j keeps its line and snippet", (line, snippet) => {
    const found = hits(`本文です。\n${line}`, "trailing_colon");
    expect(found.map((finding) => [finding.line, finding.snippet, finding.severity])).toEqual([[2, snippet, "warn"]]);
  });

  test("keeps other findings on a line with a code value", () => {
    const found = lintText("本文です。\n時間を溶かした。値：`x`");
    expect(found.map((finding) => [finding.rule, finding.line, finding.snippet])).toEqual([
      ["metaphor_verb", 2, "時間を溶かした。値：`x`"],
    ]);
  });

  test("accepts the issue 4 document", () => {
    const text = [
      "APIの定義だけを更新して、クライアントの再生成を忘れても、CIが通ってしまいます。",
      "",
      "- 場所：`.github/workflows/test.yml`",
      "- やること：再生成したあとに差分が出ないかを検査する",
      "- 規模：S",
      "",
      "追加するstepの例です。",
      "",
      "```yaml",
      "- name: Check generated client is up to date",
      "  run: |",
      "    pnpm run generate",
      "    git diff --exit-code -- src/generated",
      "```",
      "",
    ].join("\n");
    expect(lintText(text)).toEqual([]);
  });
});

describe("metaphor_verb 効く", () => {
  test.each([
    "この3つは、最初の数回の改善から効いてきます。\n",
    "この工夫は後から効いてきます。\n",
    "設定の見直しが効いた。\n",
    "毎日の積み重ねが、半年ほどで効いてくる。\n",
    "この差は、運用を続けるうちに効いてきます。\n",
    "最近になって、ようやく効いてきた。\n",
    "小さな手順の違いが、あとで効いてくれる。\n",
    "その一言が、会議の後半に効いてきて、話がまとまった。\n",
    "この考え方は、規模が大きくなるほど効いてきそうだ。\n",
    "ここで決めた順番が、障害の対応で効いてくれました。\n",
    "毎週の振り返りの習慣が効いた。\n",
    "この施策は効く。\n",
    "対策が効いて、問い合わせが落ち着いた。\n",
    "仕組みの変更が効いたのだと思う。\n",
    "地道な努力も効いた。\n",
    "ルールの見直しが効けば、手戻りは減る。\n",
    "チームでの取り組みが確実に効いた。\n",
    "地味に効く。\n",
    "# 地味に効く設定\n",
    "この方法はよく効く。\n",
    "じわじわ効いてくる。\n",
    "後から効く工夫だ。\n",
    "地味に効きます。\n",
    "じわじわと効く。\n",
    "日々の開発に**地味に効いてきます**。\n",
    "この工夫は後から効いてきます。設定の見直しも効いた。地味に効く。\n",
    "昼は会議だった。夜は資料を読んだ。この工夫は後から効いてきます。\n",
    "薬の棚を片づけた。午後は企画書を直した。この工夫は後から効いてきます。\n",
    "地味に効かない。\n",
  ])("%j fires once", (text) => {
    expect(kikuHits(text)).toHaveLength(1);
  });

  test("reports the line inside a document", () => {
    const text = "# 返信\n\nご確認ありがとうございます。\n\nこの3つは、最初の数回の改善から効いてきます。\n\n詳しくは来週お送りします。\n";
    expect(kikuHits(text).map((finding) => finding.line)).toEqual([5]);
  });

  test("looks three lines back for literal words", () => {
    expect(kikuHits("エアコンを入れた。\n一つ目。\n二つ目。\nようやく効いてきた。\n")).toEqual([]);
    expect(kikuHits("エアコンを入れた。\n一つ目。\n二つ目。\n三つ目。\nようやく効いてきた。\n").map((f) => f.line)).toEqual([5]);
  });

  test.each([
    "この薬はよく効く。\n",
    "薬が効いてきた。\n",
    "風邪薬が効いてきて、熱が下がった。\n",
    "鎮痛剤が効いてくるまで、横になって待った。\n",
    "抗生物質が効かない菌もある。\n",
    "ワクチンが効いてくるまで2週間ほどかかる。\n",
    "注射が効いて、痛みが引いた。\n",
    "点滴が効いてきたのか、顔色が戻った。\n",
    "麻酔が効いてくる。\n",
    "目薬がよく効く。\n",
    "冷房がよく効いた部屋で作業した。\n",
    "暖房が効いてきて、部屋が暖まった。\n",
    "エアコンが効いてくる。\n",
    "クーラーが効いてきた。\n",
    "車内はエアコンがよく効いている。\n",
    "空調が効いてきた。\n",
    "ブレーキがよく効く。\n",
    "雨の日はブレーキが効きにくい。\n",
    "ブレーキが効いて、車はすぐ止まった。\n",
    "わさびが効いた寿司を食べた。\n",
    "塩が効いている。\n",
    "塩気が効いたおにぎり。\n",
    "胡椒が効いたスープ。\n",
    "スパイスが効いてくる。\n",
    "辛子がよく効いた。\n",
    "出汁が効いた煮物だった。\n",
    "生姜が効いて体が温まる。\n",
    "山椒が効いてきた。\n",
    "隠し味が効いている。\n",
    "HTTPキャッシュが効きにくい。\n",
    "N+1問題への対策が必要になり、HTTPキャッシュも効きにくい。\n",
    "インデックスが効いてくる。\n",
    "お酒が効いてきた。\n",
    "毒が効いてきた。\n",
    "薬を飲んだ。30分ほどで効いてきた。\n",
    "冷房を入れた。しばらくして効いてきた。\n",
    "わさびを多めに入れた。あとから効いてくる。\n",
    "もう一つ効いたのは、聞き方の習慣だ。\n",
    "その一言が効いた。\n",
    "ブラウザの側の確かめは効きません。\n",
    "効率を上げた。\n",
    "この対策は効き目が薄い。\n",
    "設定の見直しが効かなかった。\n",
    "効く、効かないの話ではない。\n",
    "比喩的な動詞（壊れる、倒す、効くなど）を言い換えます。\n",
    "同じプロセスで動かすと timeout が効かない。\n",
    "対策が必要になり、別の手段も効きにくい。\n",
    "融通が効く人だ。\n",
    "鼻が効く。\n",
    "気が効く後輩だ。\n",
    "気の効いた返事をする。\n",
    "目が効く。\n",
    "口が効けないほど驚いた。\n",
    "小回りが効く車だ。\n",
    "応用が効く。\n",
    "機転が効いた返しだった。\n",
    "この設定は応用が効く。\n",
    "この工夫は融通が効く。\n",
    "保存が効く食べ物。\n",
    "無理が効く年齢ではない。\n",
    "気を効かせてくれた。\n",
    "融通が利く。\n",
    "気が利く。\n",
    "この工夫は後から利いてきます。\n",
    "比喩の動詞（`地味に効いてくる`、`効いてきます`）を言い換えました。\n",
    "```\nこの工夫は後から効いてきます。\n```\n",
  ])("%j does not fire", (text) => {
    expect(kikuHits(text)).toEqual([]);
  });
});

describe("bold_not_rendered", () => {
  const lines = (text: string) => hits(text, "bold_not_rendered").map((finding) => finding.line);

  test.each(bold.filter((item) => typeof item.expected_bold_problems === "number"))("$id", (item) => {
    const found = lines(item.text);
    expect(found).toHaveLength(item.expected_bold_problems!);
    if (item.expected_bold_problems! > 0 && item.expected_line_numbers.length) {
      expect(found).toEqual(item.expected_line_numbers);
    }
  });

  test.each([
    ["**太字は1行目から始まり、\n2行目で閉じる。** 続きの文には**別の太字**もある。", []],
    ["**太字は1行目から始まり、\n2行目で閉じる。** 続きの文では**次の太字が始まり、\n3行目で閉じる。**", []],
    ["**1行目から始まり、\n2行目を経由して、\n3行目で閉じる。**", []],
    ["**先行** 通常テキスト **2行に\nまたがる太字** 通常テキスト **後続**", []],
    ["次に**「太字は1行目から始まり、\n2行目で閉じる。」**を決めます。", [1]],
    ["**段落1で開いたまま\n\n段落2で閉じる。**", []],
    ["# **見出しの太字\n本文で閉じる。**", []],
    ["- **リスト1で開き\n- リスト2で閉じる**", []],
    ["`code line 1\n**not bold in code**\ncode line 2`", []],
    ["```\n**not bold**\n```\n~~~\n**also not bold**\n~~~", []],
    [String.raw`\*\*これは太字ではない\*\*`, []],
    ["**太字は1行目から始まり、\r\n2行目で閉じる。** 続きの文には**別の太字**もある。", []],
    ["次に**「文書の立場」**を決めます。", [1]],
    ["これは**必須です。**詳しくは下に書きます。", [1]],
    ["立場は**「勧め」か「決まり」**で決めます。", [1]],
    ["1行目\n2行目\n3行目で**「太字が始まり、\n4行目で閉じる。」**のを決めます。", [3]],
    ["** 重要 **", [1]],
    ["次は**重要 **です", [1]],
    ["次は** 重要**です", [1]],
    ["** 重要\n重要 **", [1]],
  ])("%j", (text, expected) => {
    expect(lines(text)).toEqual(expected);
  });
});

describe("emoji_prohibited", () => {
  test.each([
    ["今日はいい日です🚀\n", 1],
    ["旗🇯🇵です。\n", 1],
    ["1️⃣ 手順です。\n", 1],
    ["矢印→です。\n", 0],
    ["`🚀` はコードです。\n", 0],
    ["```\n🚀\n```\n", 0],
  ])("%j", (text, count) => {
    expect(hits(text, "emoji_prohibited")).toHaveLength(count);
  });
});
