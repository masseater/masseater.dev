import { Context } from "effect";
import type { Effect } from "effect";

import type { JudgeError } from "./judge-error.ts";

interface Verdict {
  readonly probability: number;
  readonly cost: number;
  readonly model: string;
  readonly inputTokens: number;
}

interface Verdicts {
  readonly probabilities: readonly number[];
  readonly cost: number;
  readonly model: string;
  readonly inputTokens: number;
}

class InjectionJudge extends Context.Service<
  InjectionJudge,
  {
    readonly verdictOf: (text: string, model: string) => Effect.Effect<Verdict, JudgeError>;
    readonly verdictsOf: (
      query: Readonly<{ text: string; parts: readonly string[]; model: string }>,
    ) => Effect.Effect<Verdicts, JudgeError>;
  }
>()("@r_masseater/injection-bisect/judge/InjectionJudge") {}

export { InjectionJudge };
export type { Verdict, Verdicts };
