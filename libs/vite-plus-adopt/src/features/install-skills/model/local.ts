import { Array as Arr, Effect, FileSystem, Path, String as Str, pipe } from "effect";

import type { SkillSelection } from "#/shared/config/index.ts";
import { checksFailed } from "#/shared/lib/errors.ts";
import type { VpToolsError } from "#/shared/lib/errors.ts";

import { SEPARATOR } from "./archive.ts";
import { selectSkills } from "./select.ts";
import type { Resolved } from "./source.ts";

const SKILL_FILE = "SKILL.md";

/** @internal */
export interface LocalDeclared {
  readonly directory: string;
  readonly skills: SkillSelection;
}

const hasSkillFile =
  (base: string) =>
  (name: string): Effect.Effect<boolean, never, FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* checkSkillFile() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      return yield* fs.exists(path.join(base, name, SKILL_FILE));
    }).pipe(Effect.orElseSucceed(() => false));

/** @internal */
export const resolveLocal =
  (root: string) =>
  ({
    directory,
    skills,
  }: LocalDeclared): Effect.Effect<Resolved, VpToolsError, FileSystem.FileSystem | Path.Path> =>
    Effect.gen(function* resolveLocalSource() {
      const fs = yield* FileSystem.FileSystem;
      const path = yield* Path.Path;
      const base = path.join(root, ...Str.split(SEPARATOR)(directory));
      const entries = yield* fs
        .readDirectory(base)
        .pipe(Effect.mapError(() => checksFailed(`${directory} is not a folder`)));
      const available = yield* pipe(
        Arr.sort(entries, Str.Order),
        Effect.filter(hasSkillFile(base)),
      );
      const names = yield* selectSkills({ label: directory, skills })(available);
      return { repository: directory, names, directory: base };
    });
