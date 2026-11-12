import { Array as Arr, Effect, Option } from "effect";

import { split } from "./chunk.ts";
import type { Part } from "./chunk.ts";
import { CHUNK_CHARACTERS, MAX_TOKENS, SPARE_TOKENS, TOKENS_PER_CHARACTER } from "./config.ts";
import { promptOf } from "./prompt.ts";
import type { Direction, Pair } from "./prompt.ts";
import type { TranslateRequestValue } from "./request.ts";

type Complete<Failure> = (
  request: Readonly<{ prompt: string; maxTokens: number }>,
) => Effect.Effect<string, Failure>;

type Progress = Readonly<{ output: readonly string[]; previous: Option.Option<Pair> }>;

const START: Progress = { output: [], previous: Option.none() };

const maxTokensOf = (text: string): number =>
  Math.min(Arr.fromIterable(text).length * TOKENS_PER_CHARACTER + SPARE_TOKENS, MAX_TOKENS);

const step =
  <Failure>(direction: Direction, complete: Complete<Failure>) =>
  (progress: Progress, part: Part): Effect.Effect<Progress, Failure> => {
    if (!part.translate) {
      return Effect.succeed({ ...progress, output: Arr.append(progress.output, part.text) });
    }
    const prompt = promptOf({ direction, previous: progress.previous, text: part.text });
    return Effect.map(complete({ prompt, maxTokens: maxTokensOf(part.text) }), (translation) => ({
      output: Arr.append(progress.output, translation),
      previous: Option.some({ source: part.text, translation }),
    }));
  };

const translateWith =
  <Failure>(complete: Complete<Failure>) =>
  ({ text, ...direction }: TranslateRequestValue): Effect.Effect<string, Failure> =>
    Effect.reduce(split(CHUNK_CHARACTERS)(text), () => START, step(direction, complete)).pipe(
      Effect.map(({ output }) => Arr.join(output, "")),
    );

export { translateWith };
export type { Complete };
