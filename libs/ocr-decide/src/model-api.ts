import { Context } from "effect";
import type { Effect } from "effect";

import type { ModelError } from "./model-error.ts";

type Part = Readonly<{ type: "text"; text: string }> | Readonly<{ type: "png"; png: Uint8Array }>;

interface Choice {
  readonly choice: string;
  readonly probability: number;
  readonly costUsd: number;
}

interface Probability {
  readonly probability: number;
  readonly costUsd: number;
}

interface Generated {
  readonly content: string;
  readonly costUsd: number;
}

class ModelApi extends Context.Service<
  ModelApi,
  {
    readonly choose: (
      request: Readonly<{
        model: string;
        state: string;
        instructions: string;
        options: Readonly<Record<string, string>>;
      }>,
    ) => Effect.Effect<Choice, ModelError>;
    readonly probability: (
      request: Readonly<{ model: string; state: string; instructions: string }>,
    ) => Effect.Effect<Probability, ModelError>;
    readonly generateJson: (
      request: Readonly<{ model: string; parts: readonly Part[]; jsonSchema: object }>,
    ) => Effect.Effect<Generated, ModelError>;
  }
>()("@r_masseater/ocr-decide/model-api/ModelApi") {}

export { ModelApi };
export type { Part };
