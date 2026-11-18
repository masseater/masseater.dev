import { Option, Order, pipe } from "effect";

import type { Comment } from "#/features/zizmor/model/finding.ts";

const VERSION_COMMENT = /^#\s*(?:(?:tag|version|ver)\s*[:=]\s*)?(?<version>\S+)$/u;
const RATCHET_COMMENT = /^#\s*ratchet:[^@]+@(?<version>\S+)$/u;
const VERSION = /^v?(?<major>\d+)(?:\.(?<minor>\d+))?(?:\.(?<patch>\d+))?$/u;

const MISSING = 0;

export interface Version {
  readonly raw: string;
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

const groupsOf = (
  pattern: RegExp,
  text: string,
): Option.Option<Readonly<Record<string, string | undefined>>> =>
  pipe(
    Option.fromNullishOr(pattern.exec(text)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
  );

const groupOf = (pattern: RegExp, text: string): Option.Option<string> =>
  pipe(
    groupsOf(pattern, text),
    Option.flatMap((groups) => Option.fromNullishOr(groups["version"])),
  );

export const rawVersionOf = (comment: Comment): Option.Option<string> =>
  Option.orElse(groupOf(RATCHET_COMMENT, comment.raw), () => groupOf(VERSION_COMMENT, comment.raw));

const numberOf = (text: string | undefined): number =>
  Option.match(Option.fromNullishOr(text), { onNone: () => MISSING, onSome: Number });

export const parseVersion = (raw: string): Option.Option<Version> =>
  pipe(
    groupsOf(VERSION, raw),
    Option.map((groups) => ({
      raw,
      major: numberOf(groups["major"]),
      minor: numberOf(groups["minor"]),
      patch: numberOf(groups["patch"]),
    })),
  );

export const versionOfComment = (comment: Comment): Option.Option<Version> =>
  pipe(rawVersionOf(comment), Option.flatMap(parseVersion));

const versionOrder: Order.Order<Version> = Order.combineAll([
  Order.mapInput(Order.Number, (version: Version) => version.major),
  Order.mapInput(Order.Number, (version: Version) => version.minor),
  Order.mapInput(Order.Number, (version: Version) => version.patch),
]);

export const isAtLeast =
  (minimum: Version) =>
  (version: Version): boolean =>
    Order.isGreaterThanOrEqualTo(versionOrder)(version, minimum);

export const isBefore =
  (limit: Version) =>
  (version: Version): boolean =>
    Order.isLessThan(versionOrder)(version, limit);
