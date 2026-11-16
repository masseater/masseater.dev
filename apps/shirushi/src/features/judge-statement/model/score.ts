import type { Judgement, Statement } from "@masseater.dev/shirushi-protocol";
import { Array as Arr, Option, pipe } from "effect";

const judgedAs =
  (judgements: readonly Judgement[]) =>
  (statements: readonly Statement[]): string =>
    globalThis.String(
      pipe(
        statements,
        Arr.filter(({ judgement }) =>
          Option.exists(Option.fromNullishOr(judgement), (value) =>
            Arr.contains(judgements, value),
          ),
        ),
        Arr.length,
      ),
    );

const RIGHT: readonly Judgement[] = ["right"];

const ANY: readonly Judgement[] = ["right", "wrong"];

export const scoreOf = (statements: readonly Statement[]): string =>
  `合ってる ${judgedAs(RIGHT)(statements)} / ${judgedAs(ANY)(statements)}`;
