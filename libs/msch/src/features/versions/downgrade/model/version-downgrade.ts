import { Array as Arr, Config, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import semver from "semver";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import {
  cargoEntries,
  manifestEntries,
  toolchainEntries,
  workspaceEntries,
} from "./version-entries.ts";
import type { VersionEntry } from "./version-entries.ts";

const RULE: RuleName = "version-downgrade";
const DEFAULT_BASE = "origin/main";
const READ_CONCURRENCY = 16;

const READERS: readonly (readonly [RegExp, (text: string) => readonly VersionEntry[]])[] = [
  [/(?:^|\/)package\.json$/u, manifestEntries],
  [/^pnpm-workspace\.yaml$/u, workspaceEntries],
  [/(?:^|\/)Cargo\.toml$/u, cargoEntries],
  [/(?:^|\/)rust-toolchain\.toml$/u, toolchainEntries],
];

const lowestOf = (spec: string): Option.Option<semver.SemVer> =>
  pipe(
    Option.liftThrowable(() => semver.minVersion(spec))(),
    Option.flatMap(Option.fromNullishOr),
    Option.orElse(() => Option.fromNullishOr(semver.coerce(spec))),
  );

const isLower = (before: string, after: string): boolean =>
  pipe(
    Option.all([lowestOf(before), lowestOf(after)]),
    Option.match({
      onNone: () => false,
      onSome: ([old, current]) => semver.lt(current, old),
    }),
  );

const FIRST_LINE = 1;

const lineOf = (text: string, { name, spec }: VersionEntry): number =>
  pipe(
    Str.split(text, "\n"),
    Arr.findFirstIndex((line) => Str.includes(name)(line) && Str.includes(spec)(line)),
    Option.match({ onNone: () => FIRST_LINE, onSome: (index) => index + FIRST_LINE }),
  );

const message = (before: VersionEntry, after: VersionEntry): string =>
  `lowers ${after.key} from ${before.spec} to ${after.spec}. Never downgrade a dependency, toolchain or engine: fix what broke on the new version instead, or ask the owner.`;

interface Compared {
  readonly file: string;
  readonly text: string;
  readonly before: readonly VersionEntry[];
  readonly after: readonly VersionEntry[];
}

const downgradesIn = ({ file, text, before, after }: Compared): readonly Problem[] => {
  const previous = Rec.fromEntries(
    pipe(
      before,
      Arr.map((entry) => [entry.key, entry] as const),
    ),
  );
  return pipe(
    after,
    Arr.flatMap((entry) =>
      pipe(
        Rec.get(previous, entry.key),
        Option.filter((old) => isLower(old.spec, entry.spec)),
        Option.map((old): Problem => ({
          file,
          line: lineOf(text, entry),
          column: FIRST_LINE,
          rule: RULE,
          message: message(old, entry),
        })),
        Option.toArray,
      ),
    ),
  );
};

const baseRevision = Effect.fn("baseRevision")(function* baseRevision(root: string) {
  const files = yield* RepositoryFiles;
  const configured = yield* Config.option(Config.String("VPA_BASE")).pipe(Effect.orDie);
  const base = Option.getOrElse(configured, () => DEFAULT_BASE);
  return yield* files.mergeBase(root, base);
});

/** @internal */
export const checkDowngrades = Effect.fn("checkDowngrades")(function* checkDowngrades(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const base = yield* baseRevision(root);
  if (Option.isNone(base)) {
    return [];
  }
  const listed = yield* files.listedFiles(root);
  const found = yield* Effect.forEach(
    pipe(
      listed,
      Arr.flatMap((name) =>
        pipe(
          READERS,
          Arr.findFirst(([pattern]) => pattern.test(name)),
          Option.map(([, read]) => [name, read] as const),
          Option.toArray,
        ),
      ),
    ),
    ([name, read]) =>
      Effect.gen(function* compare() {
        const file = files.join(root, name);
        const current = yield* files.readFile(file);
        const previous = yield* files.readAtRevision(root, base.value, name);
        return pipe(
          Option.all([previous, current]),
          Option.map(([before, after]) =>
            downgradesIn({ file, text: after, before: read(before), after: read(after) }),
          ),
          Option.getOrElse((): readonly Problem[] => []),
        );
      }),
    { concurrency: READ_CONCURRENCY },
  );
  return Arr.flatten(found);
});
