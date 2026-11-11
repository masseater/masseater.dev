import { Array as Arr, Option, pipe } from "effect";

import { QUESTION_LABEL, REASON_LABEL, STRATEGY_LABEL } from "#protocol";
import type { InterviewSummary, QuestionBody, SummaryBody } from "#protocol";
import { STRATEGIES, STRATEGY_IDS } from "#strategies";

type Prompt = Readonly<{ system: string; user: string }>;

const NONE = "（まだ無い）";
const UNKNOWN_THEME = "（まだ分からない）";

const bullets = (items: readonly string[]): string => {
  if (Arr.isReadonlyArrayNonEmpty(items)) {
    return pipe(
      items,
      Arr.map((item) => `- ${item}`),
      Arr.join("\n"),
    );
  }
  return NONE;
};

const orNone = (text: string, fallback: string): string => {
  if (text === "") {
    return fallback;
  }
  return text;
};

const summaryLines = (summary: Option.Option<InterviewSummary>): string =>
  Option.match(summary, {
    onNone: () => `テーマ: ${UNKNOWN_THEME}`,
    onSome: ({ theme, points, open, next }) =>
      pipe(
        [
          `テーマ: ${orNone(theme, UNKNOWN_THEME)}`,
          `分かったこと:\n${bullets(points)}`,
          `あいまいなこと:\n${bullets(open)}`,
          `まだ聞いていない論点:\n${bullets(next)}`,
        ],
        Arr.join("\n"),
      ),
  });

const SUMMARY_SYSTEM = pipe(
  [
    "あなたはヒアリングの記録係である。話し手は 1 人で、何を話したいのかを決めずに話し始めている。発言は音声認識の文字起こしや手で打った文字で、誤変換や言いよどみを含む。",
    "前回の要約と新しい発言を合わせ、要約を作り直す。",
    "theme は、話し手が本当に話したがっていることを 20 字以内で名付けたものである。まだ見えなければ空文字にする。話が移ったら付け直す。",
    "points は分かったこと、open は本人の言葉があいまいで確かめたいこと、next はテーマを深めるのにまだ話していない論点である。",
    "各項目は 40 字以内の短い文にし、本人の言葉をなるべく使う。points は 8 個まで、open と next は 4 個までにする。本人が言っていないことを points に書かない。",
    '出力は次の形の JSON だけにする。前置きやコードブロックを付けない。{"theme":"","points":[],"open":[],"next":[]}',
  ],
  Arr.join("\n"),
);

const summaryPrompt = (request: SummaryBody): Prompt => ({
  system: SUMMARY_SYSTEM,
  user: pipe(
    [`前回の要約:\n${summaryLines(request.previous)}`, `新しい発言:\n${request.transcript}`],
    Arr.join("\n\n"),
  ),
});

const policyLines = pipe(
  STRATEGY_IDS,
  Arr.map((id) => `- ${id}（${STRATEGIES[id].label}）: ${STRATEGIES[id].policy}`),
  Arr.join("\n"),
);

const QUESTION_SYSTEM = pipe(
  [
    "あなたは話し手本人の考えを引き出す聞き手である。話し手は何を話したいのかを決めずに来ていて、テーマを見つけるところから付き合う。発言は音声認識の文字起こしや手で打った文字で、誤変換を含む。",
    "次に投げかける質問を 1 つだけ作る。",
    "- 次の方針から、今の話にいちばん効くものを 1 つ選ぶ。テーマがまだ分からないうちは find を選ぶ",
    policyLines,
    "- 話し手の最近の発言から言葉を短く引用し、なぜそれを聞くのかを 1 文で示す",
    "- 質問は 1 つで、口に出して聞ける 60 字以内の 1 文にする。二択や選択肢を並べない",
    "- 「わからない」「うーん」のような返事には、同じことを言い換えて聞き直さず、もっと手前の事実を聞く",
    "- 評価・助言・称賛・相づちを書かない",
    "- すでに聞いた質問と同じことを聞かない",
    "出力は次の 3 行だけにする。",
    `${STRATEGY_LABEL}: （選んだ方針の id）`,
    `${REASON_LABEL}: 「（引用）」と話していたので、（確かめたいこと）を聞きます。`,
    `${QUESTION_LABEL}: （質問文）`,
  ],
  Arr.join("\n"),
);

const questionPrompt = (request: QuestionBody): Prompt => ({
  system: QUESTION_SYSTEM,
  user: pipe(
    [
      `要約:\n${summaryLines(request.summary)}`,
      `すでに聞いた質問:\n${bullets(request.asked)}`,
      `最近の発言:\n${orNone(request.recent, NONE)}`,
    ],
    Arr.join("\n\n"),
  ),
});

export { questionPrompt, summaryPrompt };
export type { Prompt };
