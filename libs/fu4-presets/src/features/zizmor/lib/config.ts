import { Array as Arr, Option, pipe } from "effect";

import type { RepositoryUses } from "#/features/zizmor/model/common.ts";
import type {
  Config,
  IgnoreRule,
  RuleConfig,
  UnpinnedUsesPolicies,
  UsesPolicy,
} from "#/features/zizmor/model/config.ts";
import type { Finding, Severity } from "#/features/zizmor/model/finding.ts";

import { patternMatches, usesRef } from "./uses.ts";
import type { UsesPattern } from "./uses.ts";

const ONE_BASED = 1;

export const policyFor =
  (policies: UnpinnedUsesPolicies) =>
  (uses: RepositoryUses): readonly [Option.Option<UsesPattern>, UsesPolicy] =>
    pipe(
      Option.fromNullishOr(policies.tree.get(uses.owner)),
      Option.flatMap(Arr.findFirst(([pattern]) => patternMatches(pattern)(usesRef(uses)))),
      Option.match({
        onNone: () => [Option.none(), policies.fallback] as const,
        onSome: ([pattern, policy]) => [Option.some(pattern), policy] as const,
      }),
    );

const ruleFor =
  (config: Config) =>
  (ident: string): Option.Option<RuleConfig> =>
    Option.fromNullishOr(config.rules.get(ident));

export const disables =
  (config: Config) =>
  (ident: string): boolean =>
    pipe(
      ruleFor(config)(ident),
      Option.exists((rule) => rule.disable),
    );

export const severityRemap =
  (config: Config) =>
  (found: Finding): Option.Option<Severity> =>
    pipe(
      ruleFor(config)(found.ident),
      Option.flatMap((rule) => rule.remap),
    );

const matchesAt =
  (actual: number) =>
  (wanted: Option.Option<number>): boolean =>
    Option.match(wanted, {
      onNone: () => true,
      onSome: (value) => value === actual + ONE_BASED,
    });

const ignoresLocation =
  (location: Finding["locations"][number]) =>
  (rule: IgnoreRule): boolean =>
    matchesAt(location.concrete.start.row)(rule.line) &&
    (Option.isNone(rule.line) || matchesAt(location.concrete.start.column)(rule.column));

export const configIgnores =
  (config: Config) =>
  (filename: string) =>
  (found: Finding): boolean => {
    const rules = pipe(
      ruleFor(config)(found.ident),
      Option.map((rule) => rule.ignore),
      Option.getOrElse((): readonly IgnoreRule[] => []),
      Arr.filter((each) => each.filename === filename),
    );
    return pipe(
      found.locations,
      Arr.some((location) => pipe(rules, Arr.some(ignoresLocation(location)))),
    );
  };
