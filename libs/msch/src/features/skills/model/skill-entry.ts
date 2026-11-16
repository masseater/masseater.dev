import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

import { groupOf } from "#/shared/lib/match-groups.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const RULE: RuleName = "unlocked-skill";
const LOCK_FILE = "skills-lock.json";
const SOURCE = "masseater/skills";
const ENTRY = "masseater-ecosystem";
const INSTALLED_ENTRY = `.agents/skills/${ENTRY}/SKILL.md`;
const NAMED = /`(?<name>[a-z0-9]+(?:-[a-z0-9]+)*)`(?!\]\()/gu;
const START = 0;

const Lock = Schema.Struct({
  skills: Schema.Record(Schema.String, Schema.Struct({ source: Schema.String })),
});
const decodeLock = Schema.decodeUnknownOption(Schema.fromJsonString(Lock));

interface LockedSkills {
  readonly file: string;
  readonly source: string;
  readonly names: readonly string[];
}

const namedIn = (entry: string): readonly string[] =>
  pipe(
    Arr.fromIterable(Str.matchAll(NAMED)(entry)),
    Arr.flatMap((found) => Option.toArray(groupOf("name")(found))),
    Arr.dedupe,
  );

const fixFor = (name: string): string =>
  `Run "vp exec skills add ${SOURCE} -s ${name} -y". The command drops ref from the ${SOURCE} entries, so write it back.`;

const problemIn =
  ({ file, source }: LockedSkills) =>
  (anchor: string, message: string): Problem => ({
    file,
    ...positionOf(source)(
      pipe(
        Str.indexOf(anchor)(source),
        Option.getOrElse(() => START),
      ),
    ),
    rule: RULE,
    message,
  });

const lockedSkills = Effect.fn("lockedSkills")(function* lockedSkills(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, LOCK_FILE);
  const text = yield* files.readFile(file);
  return pipe(
    text,
    Option.flatMap((source) =>
      pipe(
        decodeLock(source),
        Option.map((lock): LockedSkills => ({
          file,
          source,
          names: pipe(
            lock.skills,
            Rec.filter((skill) => skill.source === SOURCE),
            Rec.keys,
          ),
        })),
      ),
    ),
    Option.filter(({ names }) => Arr.isReadonlyArrayNonEmpty(names)),
  );
});

/** @internal */
export const checkSkillEntry = Effect.fn("checkSkillEntry")(function* checkSkillEntry(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const lock = yield* lockedSkills(root);
  if (Option.isNone(lock)) {
    return [];
  }
  const { names } = lock.value;
  const problemAt = problemIn(lock.value);
  if (!Arr.contains(names, ENTRY)) {
    return [
      problemAt(
        SOURCE,
        `installs skills from ${SOURCE} without ${ENTRY}, the skill that says which of them to read in which situation. ${fixFor(ENTRY)}`,
      ),
    ];
  }
  const entry = yield* files.readFile(files.join(root, INSTALLED_ENTRY));
  return pipe(
    entry,
    Option.map(namedIn),
    Option.getOrElse((): readonly string[] => []),
    Arr.filter((name) => !Arr.contains(names, name)),
    Arr.map((name) =>
      problemAt(
        `"${ENTRY}"`,
        `${ENTRY} tells agents to read ${name}, which this file does not install. ${fixFor(name)}`,
      ),
    ),
  );
});
