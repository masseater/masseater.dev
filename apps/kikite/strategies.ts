import type { Option } from "effect";
import { Array as Arr } from "effect";

const STRATEGY_IDS = [
  "find",
  "concrete",
  "ladder",
  "coverage",
  "hypothesis",
  "propose",
  "episode",
  "confirm",
  "checkpoint",
  "wrap",
] as const;

type StrategyId = (typeof STRATEGY_IDS)[number];

type Strategy = Readonly<{ label: string; policy: string }>;

const STRATEGIES: Readonly<Record<StrategyId, Strategy>> = {
  find: {
    label: "テーマを探す",
    policy:
      "まだ何の話か本人にも分かっていない。発言の中でいちばん引っかかっている言葉を 1 つ拾い、それが指していそうなことを自分で 1 つ言い当てて、合っているかを聞く。形は「『〜』というのは、〜のことですか」。外れたら本人が訂正してくれるので、テーマを決めつけてよい。",
  },
  concrete: {
    label: "具体化",
    policy:
      "直前の発言から曖昧な言葉を 1 つ選び（「いい感じ」「ちゃんと」「いつも」のような語）、それが指していそうな具体的な場面・数・例を自分で 1 つ挙げて、合っているかを聞く。形は「『〜』というのは、たとえば〜のようなことですか」。本人に例を考えさせない。",
  },
  ladder: {
    label: "なぜを掘る",
    policy:
      "直前に出た好み・判断・不満について、それがなぜ大事なのかを 1 段上の目的や価値に向けて聞く。形は「〜だと、何が嬉しい（困る）のですか」。「なぜ」の語を使わない。",
  },
  coverage: {
    label: "論点を埋める",
    policy:
      "要約の「まだ聞いていない論点」か調べた手がかりから、テーマに最も効くものを 1 つ選び、直前の話から橋渡しして聞く。論点には自分の見立てを 1 つ添え、本人が答えやすい形にする。直前の話題をそれ以上掘り下げない。",
  },
  hypothesis: {
    label: "仮説をぶつける",
    policy:
      "ここまでの発言と調べた手がかりをつなげて、本人がまだ言っていない仮説を 1 つ言い切りの形で示し、合っているかを聞く。形は「〜ということではないですか。違うなら、どこが違いますか」。",
  },
  propose: {
    label: "提案する",
    policy:
      "本人の困りごとや望みに対して、調べた手がかりや知られた方法から具体的な案を 1 つ出し、それでよいかを聞く。形は「〜なら、〜するのはどうですか」。案の中身は自分で決め、本人に案を考えさせない。",
  },
  episode: {
    label: "出来事から",
    policy:
      "抽象的な話を、過去の具体的な 1 回の出来事に引き戻す。形は「直近で〜したときは、何が起きましたか」。「最後に」は終わりの合図と聞き違えられるので使わない。日付や回数のように本人が覚えていないことを聞かない。",
  },
  confirm: {
    label: "理解を確かめる",
    policy:
      "直前の話を本人の言葉で言い換えて理解が合っているかを確かめ、合っている前提で一歩先を聞く。形は「〜ということで合っていますか。その場合、〜はどうしますか（どう思いますか）」。言い換えに本人が言っていないことを足さない。",
  },
  checkpoint: {
    label: "区切って要約する",
    policy:
      "今の話題で分かったことを 2〜3 点に要約し、合っているかを確かめてから、要約の「次に聞くこと」と調べた手がかりから次の話題の候補を 3 つ並べて、話し手が好きなものから話せるようにする。形は「ここまでを、〜と〜とまとめました。合っていますか。次は、〜、〜、〜のどれからでも聞かせてください」。",
  },
  wrap: {
    label: "切り上げる",
    policy:
      "話し手が終わりたい・切り上げたい・まとめてほしいと言ったときだけ選ぶ。「終わらないで」「もっと聞いて」「最後じゃない」は続けたいという意味なので選ばない。質問は作らず、「ここまでをまとめます。」とだけ書く。",
  },
};

const strategyOf = (text: string): Option.Option<StrategyId> =>
  Arr.findFirst(STRATEGY_IDS, (id) => id === text);

export { STRATEGIES, STRATEGY_IDS, strategyOf };
export type { Strategy, StrategyId };
