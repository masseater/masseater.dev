import { Context } from "effect";
import type { Effect } from "effect";

import type { JudgeError } from "./judge-error.ts";

export interface Verdict {
  readonly probability: number;
  readonly cost: number;
  readonly model: string;
  readonly inputTokens: number;
}

export interface Verdicts {
  readonly probabilities: readonly number[];
  readonly cost: number;
  readonly model: string;
  readonly inputTokens: number;
}

export class InjectionJudge extends Context.Service<
  InjectionJudge,
  {
    readonly verdictOf: (text: string, model: string) => Effect.Effect<Verdict, JudgeError>;
    readonly verdictsOf: (
      query: Readonly<{ text: string; parts: readonly string[]; model: string }>,
    ) => Effect.Effect<Verdicts, JudgeError>;
  }
>()("@r_masseater/injection-bisect/entities/judge/model/judge/InjectionJudge") {}
