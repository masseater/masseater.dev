import { Array as Arr, Option, String as Str, pipe } from "effect";

import { QUESTION_LABEL, REASON_LABEL, STRATEGY_LABEL } from "#protocol";
import type {
  CorrectionBody,
  HeardText,
  InterviewLead,
  InterviewSummary,
  QuestionBody,
  ResearchBody,
  SummaryBody,
} from "#protocol";
import { STRATEGIES, STRATEGY_IDS } from "#strategies";

export type Prompt = Readonly<{ system: string; user: string }>;

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

const knownLines = ({ theme, points, open, next }: InterviewSummary): string =>
  pipe(
    [
      `テーマ: ${orNone(theme, UNKNOWN_THEME)}`,
      `分かったこと:\n${bullets(points)}`,
      `あいまいなこと:\n${bullets(open)}`,
      `まだ聞いていない論点:\n${bullets(next)}`,
    ],
    Arr.join("\n"),
  );

const summaryLines = (summary: Option.Option<InterviewSummary>): string =>
  Option.match(summary, {
    onNone: () => `テーマ: ${UNKNOWN_THEME}`,
    onSome: knownLines,
  });

const leadLine = ({ topic, detail, source }: InterviewLead): string =>
  pipe([topic, detail, source], Arr.filter(Str.isNonEmpty), Arr.join(" / "));

const leadLines = (leads: readonly InterviewLead[]): string =>
  pipe(leads, Arr.map(leadLine), bullets);

const SUMMARY_SYSTEM = pipe(
  [
    "あなたはヒアリングの記録係である。話し手は 1 人で、何を話したいのかを決めずに話し始めている。発言は音声認識の文字起こしや手で打った文字で、誤変換や言いよどみを含む。",
    "前回の要約と新しい発言を合わせ、要約を作り直す。",
    "theme は、話し手が本当に話したがっていることを 20 字以内で名付けたものである。まだ見えなければ空文字にする。話が移ったら付け直す。",
    "points は分かったこと、open は本人の言葉があいまいで確かめたいこと、next はテーマを深めるのにまだ話していない論点である。",
    "next は聞き手が次に聞くとよい論点で、本人が答えやすいように具体的に書く。",
    "各項目は 40 字以内の短い文にし、本人の言葉をなるべく使う。points は 10 個まで、open は 6 個まで、next は 8 個までにし、next は 5 個以上出す。本人が言っていないことを points に書かない。",
    '出力は次の形の JSON だけにする。前置きやコードブロックを付けない。{"theme":"","points":[],"open":[],"next":[]}',
  ],
  Arr.join("\n"),
);

export const summaryPrompt = (request: SummaryBody): Prompt => ({
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
    "- 質問は 1 つで、口に出して聞ける 60 字以内の 1 文にする。propose と hypothesis は 90 字以内、checkpoint は要約と候補を含めて 150 字以内にしてよい。checkpoint 以外では二択や選択肢を並べない",
    "- 話し手に案・例・数・理想・やり方を考えさせる質問をしない（「どんな〜がいいですか」「何個ぐらいですか」「たとえばどんな一文になりますか」「どう組み込んでいますか」の類）。話し手は分からないから話している。代わりに自分で具体的な案や見立てを 1 つ出し、合っているかを聞く",
    "- 「わからない」「知らない」「調べて」と言われたら、調べた手がかりや知られた方法から案を出す（propose か hypothesis）。同じ問いを言い換えて返さない",
    "- 調べた手がかりがあれば、それを使って話を広げる。すでに聞いた質問の直近 3 つに propose も hypothesis も無ければ、次はどちらかを選ぶ",
    "- 質問を「最後に」で始めない。終わりの合図と聞き違えられる",
    "- 本人が覚えていないこと（日付・回数・昨日の行動の一覧）を聞かない",
    "- ベテランの聞き手のように、広げる質問と確かめる質問を往復する。すでに聞いた質問の直近 3 つに confirm も checkpoint も無ければ、次は confirm か checkpoint を選ぶ",
    "- 同じ話題で答えが新しい事実を足さなくなった、または本人が話題を変えたら checkpoint で区切る",
    "- 本人が「切り上げて」「終わり」「止めて」「まとめて」のように終わりたいと言ったら、ほかの方針より優先して wrap を選ぶ。「終わらないで」「もっと聞いて」「最後じゃない」は続けたいという意味なので wrap を選ばない",
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

export const questionPrompt = (request: QuestionBody): Prompt => ({
  system: QUESTION_SYSTEM,
  user: pipe(
    [
      `要約:\n${summaryLines(request.summary)}`,
      `すでに聞いた質問:\n${bullets(request.asked)}`,
      `調べた手がかり:\n${leadLines(request.leads)}`,
      `最近の発言:\n${orNone(request.recent, NONE)}`,
    ],
    Arr.join("\n\n"),
  ),
});

const RESEARCH_SYSTEM = pipe(
  [
    "あなたはヒアリングの裏方の調査係である。聞き手が話を広げるために使う手がかりを探す。話し手は何を話したいのかを自分でも分からないまま話している。",
    "要約・最近の発言・話し手の過去のヒアリングの記録を読み、話し手が興味を持ちそうな話題、困りごとに効く既知の方法・製品・研究、過去の発言とのつながりを探す。",
    "WebSearch と WebFetch で調べてよい。調べた事実だけを書き、作り話をしない。",
    "すでに出した手がかりと同じものを出さない。手がかりは 3〜6 個にする。",
    "topic は 20 字以内の名前、detail は話し手にどう効くかを 80 字以内で、source は調べた URL か、過去の記録から取ったなら memory、どちらでもなければ空文字にする。",
    '出力は次の形の JSON だけにする。前置きやコードブロックを付けない。{"leads":[{"topic":"","detail":"","source":""}]}',
  ],
  Arr.join("\n"),
);

export const researchPrompt = (request: ResearchBody): Prompt => ({
  system: RESEARCH_SYSTEM,
  user: pipe(
    [
      `要約:\n${knownLines(request.summary)}`,
      `最近の発言:\n${orNone(request.recent, NONE)}`,
      `過去のヒアリングの記録:\n${bullets(request.memory)}`,
      `すでに出した手がかり:\n${leadLines(request.known)}`,
    ],
    Arr.join("\n\n"),
  ),
});

const CORRECTION_SYSTEM = pipe(
  [
    "あなたは音声認識の文字起こしを直す係である。発言は日本語の話し言葉で、固有名詞や技術用語が誤変換されている。",
    "文脈と話題から、明らかな誤変換だけを正しい語に直す（例: 「オゾンコシ」→「文字起こし」、「サヴェージェント」→「サブエージェント」）。",
    "言いよどみ・口調・語順は残す。意味が分からない部分を推測で書き換えない。直すところが無い行はそのまま返す。",
    '入力と同じ id で、すべての行を返す。出力は次の形の JSON だけにする。前置きやコードブロックを付けない。{"lines":[{"id":0,"text":""}]}',
  ],
  Arr.join("\n"),
);

const numbered = (lines: readonly HeardText[]): string =>
  pipe(
    lines,
    Arr.map(({ id, text }) => `${id}: ${text}`),
    Arr.join("\n"),
  );

export const correctionPrompt = (request: CorrectionBody): Prompt => ({
  system: CORRECTION_SYSTEM,
  user: pipe(
    [
      `話の文脈:\n${orNone(request.context, NONE)}`,
      `直す行（id: 発言）:\n${numbered(request.lines)}`,
    ],
    Arr.join("\n\n"),
  ),
});
