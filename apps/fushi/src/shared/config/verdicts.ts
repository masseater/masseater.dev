export type Verdict = "keep" | "fix" | "suggest" | "reject";

export const VERDICTS: readonly Verdict[] = ["keep", "fix", "suggest", "reject"];

export const VERDICT_LABELS: Readonly<Record<Verdict, string>> = {
  keep: "守る",
  fix: "直す",
  suggest: "提案",
  reject: "却下",
};

export const VERDICT_ACTIONS: Readonly<Record<Verdict, string>> = {
  keep: "ルールにする",
  fix: "ルールにする",
  suggest: "提案にする",
  reject: "却下する",
};
