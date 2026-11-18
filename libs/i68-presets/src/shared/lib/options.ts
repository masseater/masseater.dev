import type { RuleOptions } from "@r_masseater/i68";
import { Option, Predicate, pipe } from "effect";

export interface NumberOption {
  readonly key: string;
  readonly fallback: number;
}

export const numberOption =
  ({ key, fallback }: NumberOption) =>
  (options: RuleOptions): number =>
    pipe(
      Option.fromNullishOr(options[key]),
      Option.filter(Predicate.isNumber),
      Option.getOrElse(() => fallback),
    );
