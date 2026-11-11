import { Array as Arr, Option, pipe } from "effect";

import { QUESTION_LABEL, REASON_LABEL } from "#protocol";
import type { InterviewSetup, InterviewSummary, QuestionBody, SummaryBody } from "#protocol";
import { STRATEGIES } from "#strategies";

type Prompt = Readonly<{ system: string; user: string }>;

const NONE = "（まだ無い）";
const NO_GOAL = "（指定なし）";

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

const setupLines = (setup: InterviewSetup): string =>
  pipe(
    [`テーマ: ${setup.theme}`, `最後に得たいもの: ${orNone(setup.goal, NO_GOAL)}`],
    Arr.join("\n"),
  );

const summaryLines = (summary: Option.Option<InterviewSummary>): string =>
  Option.match(summary, {
    onNone: () => NONE,
    onSome: ({ points, open, next }) =>
      pipe(
        [
          `分かったこと:\n${bullets(points)}`,
          `あいまいなこと:\n${bullets(open)}`,
          `まだ聞いていない論点:\n${bullets(next)}`,
        ],
        Arr.join("\n"),
      ),
  });

const SUMMARY_SYSTEM = pipe(
  [
    "あなたはヒアリングの記録係である。話し手は 1 人で、音声認識の文字起こしなので誤変換や言いよどみを含む。",
    "前回の要約と新しい発言を合わせ、要約を作り直す。",
    "points は分かったこと、open は本人の言葉があいまいで確かめたいこと、next はゴールに必要なのにまだ話していない論点である。",
    "各項目は 40 字以内の短い文にし、points は 8 個まで、open と next は 4 個までにする。本人が言っていないことを points に書かない。",
    '出力は次の形の JSON だけにする。前置きやコードブロックを付けない。{"points":[],"open":[],"next":[]}',
  ],
  Arr.join("\n"),
);

const summaryPrompt = (request: SummaryBody): Prompt => ({
  system: SUMMARY_SYSTEM,
  user: pipe(
    [
      setupLines(request.setup),
      `前回の要約:\n${summaryLines(request.previous)}`,
      `新しい発言:\n${request.transcript}`,
    ],
    Arr.join("\n\n"),
  ),
});

const questionSystem = (request: QuestionBody): string =>
  pipe(
    [
      "あなたは話し手本人の考えを引き出す聞き手である。話し手の発言は音声認識の文字起こしで、誤変換を含む。",
      "次に投げかける質問を 1 つだけ作る。",
      "- 話し手の最近の発言から言葉を短く引用し、なぜそれを聞くのかを 1 文で示す",
      "- 最近の発言がまだ無いときは、テーマから最初の質問を作り、根拠にはテーマのどこから聞くかを書く",
      "- 質問は 1 つで、口に出して聞ける 60 字以内の 1 文にする",
      "- 評価・助言・称賛・相づちを書かない",
      "- すでに聞いた質問と同じことを聞かない",
      `質問の方針: ${STRATEGIES[request.strategy].policy}`,
      "出力は次の 2 行だけにする。",
      `${REASON_LABEL}: 「（引用）」と話していたので、（確かめたいこと）を聞きます。`,
      `${QUESTION_LABEL}: （質問文）`,
    ],
    Arr.join("\n"),
  );

const questionPrompt = (request: QuestionBody): Prompt => ({
  system: questionSystem(request),
  user: pipe(
    [
      setupLines(request.setup),
      `要約:\n${summaryLines(request.summary)}`,
      `すでに聞いた質問:\n${bullets(request.asked)}`,
      `最近の発言:\n${orNone(request.recent, NONE)}`,
    ],
    Arr.join("\n\n"),
  ),
});

export { questionPrompt, summaryPrompt };
export type { Prompt };
