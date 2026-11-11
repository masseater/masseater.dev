const STRATEGY_IDS = ["concrete", "ladder", "coverage", "hypothesis", "episode"] as const;

type StrategyId = (typeof STRATEGY_IDS)[number];

type Strategy = Readonly<{ label: string; policy: string }>;

const STRATEGIES: Readonly<Record<StrategyId, Strategy>> = {
  concrete: {
    label: "具体化",
    policy:
      "直前の発言から曖昧な言葉を 1 つ選び（「いい感じ」「ちゃんと」「いつも」のような語）、それが指す具体的な場面・数・例を聞く。形は「『〜』というのは、たとえばどんな〜ですか」。",
  },
  ladder: {
    label: "なぜを掘る",
    policy:
      "直前に出た好み・判断・不満について、それがなぜ大事なのかを 1 段上の目的や価値に向けて聞く。形は「〜だと、何が嬉しい（困る）のですか」。「なぜ」の語を使わない。",
  },
  coverage: {
    label: "論点を埋める",
    policy:
      "要約の「まだ聞いていない論点」から、ゴールに最も効くものを 1 つ選び、直前の話から橋渡しして聞く。直前の話題をそれ以上掘り下げない。",
  },
  hypothesis: {
    label: "仮説をぶつける",
    policy:
      "ここまでの発言をつなげて、本人がまだ言っていない仮説を 1 つ言い切りの形で示し、合っているかを聞く。形は「〜ということではないですか。違うなら、どこが違いますか」。",
  },
  episode: {
    label: "出来事から",
    policy:
      "抽象的な話を、過去の具体的な 1 回の出来事に引き戻す。形は「最後に〜したのはいつで、そのとき何が起きましたか」。そこから見たこと・判断したことを時系列で聞く。",
  },
};

const MODEL_IDS = ["haiku", "sonnet", "opus"] as const;

type ModelId = (typeof MODEL_IDS)[number];

export { MODEL_IDS, STRATEGIES, STRATEGY_IDS };
export type { ModelId, Strategy, StrategyId };
