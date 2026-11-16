import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import { resolveConfigFromFile } from "vite-plus";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { positionOf } from "#/shared/lib/text-position.ts";

const ENTRY_RULE: RuleName = "unlocked-skill";
const VISIBLE_RULE: RuleName = "skill-source-visible";
const CONFIG_FILE = "vite.config.ts";
const RENOVATE_FILE = "renovate.json";
const SOURCE = "masseater/skills";
const PRESET = "github>masseater/masseater.dev//libs/vite-plus-adopt/renovate";
const START = 0;
const LOCAL_PREFIX = "./";
const REGEX_SPECIAL = /[.*+?^${}()|[\]\\/]/gu;

const Source = Schema.Struct({
  commit: Schema.optional(Schema.String),
  skills: Schema.Union([Schema.Literal("all"), Schema.Array(Schema.String)]),
});
const SkillsConfig = Schema.Struct({
  skills: Schema.Record(Schema.String, Source),
});
const decodeSkills = Schema.decodeUnknownOption(SkillsConfig);

const taggedError = Schema.TaggedError;

class SkillsConfigUnreadable extends taggedError<
  SkillsConfigUnreadable,
  { readonly brand: unique symbol }
>()("SkillsConfigUnreadable", { file: Schema.String }) {}

type Sources = Readonly<Record<string, typeof Source.Type>>;

interface Declared {
  readonly file: string;
  readonly text: string;
  readonly sources: Sources;
}

const problemAt =
  (rule: RuleName, file: string, text: string) =>
  (anchor: string, message: string): Problem => ({
    file,
    ...positionOf(text)(
      pipe(
        Str.indexOf(anchor)(text),
        Option.getOrElse(() => START),
      ),
    ),
    rule,
    message,
  });

const declaredSkills = Effect.fn("declaredSkills")(function* declaredSkills(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, CONFIG_FILE);
  const text = yield* files.readFile(file);
  if (Option.isNone(text)) {
    return Option.none<Declared>();
  }
  const config = yield* Effect.tryPromise({
    try: () => resolveConfigFromFile(file),
    catch: () => SkillsConfigUnreadable.make({ file }),
  }).pipe(Effect.option);
  return pipe(
    config,
    Option.flatMap(decodeSkills),
    Option.map(({ skills }): Declared => ({ file, text: text.value, sources: skills })),
  );
});

const entryProblems = ({ file, text, sources }: Declared): readonly Problem[] => {
  const at = problemAt(ENTRY_RULE, file, text);
  return pipe(
    Rec.get(sources, SOURCE),
    Option.match({
      onNone: () => [
        at(
          "skills",
          `does not install ${SOURCE}. Add "${SOURCE}": { commit, root: "plugins/masseater-skills/skills", skills: "all" } to skills.`,
        ),
      ],
      onSome: (source) =>
        pipe(
          Option.liftPredicate(source, ({ skills }) => skills !== "all"),
          Option.map(() =>
            at(
              `"${SOURCE}"`,
              `picks skills from ${SOURCE} by name. Write skills: "all", so every repository gets each new skill with the next digest update.`,
            ),
          ),
          Option.toArray,
        ),
    }),
  );
};

const literalPattern = (repository: string, commit: string): RegExp =>
  new RegExp(
    `"${Str.replaceAll(REGEX_SPECIAL, String.raw`\$&`)(repository)}": \\{\\s*commit: "${commit}"`,
    "u",
  );

const visibleProblems = ({ file, text, sources }: Declared): readonly Problem[] =>
  pipe(
    Rec.toEntries(sources),
    Arr.filter(([repository]) => !Str.startsWith(LOCAL_PREFIX)(repository)),
    Arr.filter(([repository, { commit }]) => !literalPattern(repository, commit ?? "").test(text)),
    Arr.map(([repository]) =>
      problemAt(
        VISIBLE_RULE,
        file,
        text,
      )(
        repository,
        `declares ${repository} in a form the Renovate preset cannot read. Write "${repository}": { commit: "<sha>", ... } with commit first and as a string literal.`,
      ),
    ),
  );

const presetProblems = Effect.fn("presetProblems")(function* presetProblems(root: string) {
  const files = yield* RepositoryFiles;
  const file = files.join(root, RENOVATE_FILE);
  const text = yield* files.readFile(file);
  const extended = pipe(text, Option.exists(Str.includes(`"${PRESET}"`)));
  if (extended) {
    return [];
  }
  return [
    problemAt(
      VISIBLE_RULE,
      file,
      Option.getOrElse(text, () => ""),
    )(
      "extends",
      `does not extend ${PRESET}, so Renovate never updates the commits in the skills section of ${CONFIG_FILE}.`,
    ),
  ];
});

/** @internal */
export const checkSkillEntry = Effect.fn("checkSkillEntry")(function* checkSkillEntry(
  root: string,
) {
  const declared = yield* declaredSkills(root);
  if (Option.isNone(declared)) {
    return [];
  }
  const preset = yield* presetProblems(root);
  return [...entryProblems(declared.value), ...visibleProblems(declared.value), ...preset];
});
