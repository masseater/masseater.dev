interface NovelRule {
  readonly rule: string;
  readonly message: string;
  readonly pattern: RegExp;
}

const EMOTION_EXPLAINED = "emotion_explained";
const EMOTION_MESSAGE = "感情の説明";
const CLICHE = "ai_cliche";
const CLICHE_MESSAGE = "AI の決まり文句";
const SIMILE = "simile";

const NOVEL_RULES: readonly NovelRule[] = [
  {
    rule: EMOTION_EXPLAINED,
    message: EMOTION_MESSAGE,
    pattern:
      /(?:胸|心)(?:の(?:奥|中|底))?(?:が|は)[^。、]{0,12}(?:温か|あたたか|熱く|痛ん|苦しく|締め付け|ざわつ|躍っ|弾ん|満たさ)[^。]*。?/gu,
  },
  {
    rule: EMOTION_EXPLAINED,
    message: EMOTION_MESSAGE,
    pattern:
      /(?:嬉し|悲し|寂し|さみし|切な|悔し|愛おし|恥ずかし)(?:い|さ)(?:気持ち|思い|感情)[^。]*。?/gu,
  },
  {
    rule: EMOTION_EXPLAINED,
    message: EMOTION_MESSAGE,
    pattern: /[^。]*という(?:感情|気持ち)[^。]*。?/gu,
  },
  {
    rule: EMOTION_EXPLAINED,
    message: EMOTION_MESSAGE,
    pattern:
      /(?:喜び|悲しみ|寂しさ|怒り|不安|安堵)が(?:込み上げ|こみ上げ|湧き上が|広が|押し寄せ)[^。]*。?/gu,
  },
  {
    rule: CLICHE,
    message: CLICHE_MESSAGE,
    pattern:
      /静寂|紡(?:ぐ|いだ|がれ|ぎ出)|刻み込|どこか(?:寂しげ|懐かしげ|切なげ|遠く)|小さく息を(?:吐|つ)|口元を(?:綻ば|ほころば)|温もり|揺らめ|煌め|一筋の(?:涙|光)|優しく微笑/gu,
  },
  {
    rule: SIMILE,
    message: "飾った比喩",
    pattern: /まるで[^。]{1,30}(?:よう|みたい)[^。]*。?/gu,
  },
];

export { NOVEL_RULES };
export type { NovelRule };
