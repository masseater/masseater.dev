import { fileURLToPath } from "node:url";

import { findSkillFiles } from "@tanstack/intent";
import { Array as Arr, Effect, Option, Stream, String as Str, pipe } from "effect";
import { ChildProcess } from "effect/process";

import { publishedProjects } from "#/entities/workspace/index.ts";
import type { WorkspaceProject } from "#/entities/workspace/index.ts";
import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const RULE: RuleName = "published-skills";
const KEYWORD = "tanstack-intent";
const SKILLS = "skills";
const MANIFEST_FILE = "package.json";
const SKILL_FILE = "SKILL.md";
const FIRST = 1;
const SUCCEEDED = 0;
const SYNC = "Run vp exec intent maintainer sync in the repository root.";
const INTENT_CLI = fileURLToPath(new URL("./cli.mjs", import.meta.resolve("@tanstack/intent")));

const problemAt = (file: string, message: string): Problem => ({
  file,
  line: FIRST,
  column: FIRST,
  rule: RULE,
  message,
});

const skillDirectoriesIn = (
  files: typeof RepositoryFiles.Service,
  directory: string,
): readonly string[] =>
  pipe(
    findSkillFiles(files.join(directory, SKILLS)),
    Arr.filter((file) => files.basename(file) === SKILL_FILE),
    Arr.map((file) => files.relative(directory, files.dirname(file))),
  );

const isShipped =
  (listed: readonly string[]) =>
  (skill: string): boolean =>
    Arr.contains(listed, SKILLS) || Arr.contains(listed, skill);

const packagingMessages = (
  { keywords, files }: WorkspaceProject,
  skills: readonly string[],
): readonly string[] => {
  const keyword = pipe(
    Option.liftPredicate(keywords, (own) => !Arr.contains(own, KEYWORD)),
    Option.map(
      () =>
        `is published with skills but lacks the ${KEYWORD} keyword, so Intent does not find them. ${SYNC}`,
    ),
  );
  const unshipped = pipe(
    files,
    Option.map((listed) =>
      pipe(
        skills,
        Arr.filter((skill) => !isShipped(listed)(skill)),
      ),
    ),
    Option.filter((left) => Arr.isReadonlyArrayNonEmpty(left)),
    Option.map(
      (left) =>
        `leaves ${Arr.join(left, ", ")} out of files, so the published package does not ship them. ${SYNC}`,
    ),
  );
  return Arr.getSomes([keyword, unshipped]);
};

const validationOf = Effect.fn("validationOf")(function* validationOf(directory: string) {
  const handle = yield* ChildProcess.make("node", [INTENT_CLI, "validate", SKILLS], {
    cwd: directory,
    extendEnv: true,
    stdin: "ignore",
  });
  const [output, status] = yield* Effect.all(
    [handle.all.pipe(Stream.decodeText(), Stream.mkString), handle.exitCode],
    { concurrency: "unbounded" },
  );
  return Option.liftPredicate(Str.trim(output), () => Number(status) !== SUCCEEDED);
}, Effect.scoped);

const problemsIn = Effect.fn("problemsIn")(function* problemsIn(
  root: string,
  project: WorkspaceProject,
) {
  const files = yield* RepositoryFiles;
  const directory = files.join(root, project.directory);
  const manifest = files.join(directory, MANIFEST_FILE);
  const skills = skillDirectoriesIn(files, directory);
  if (!Arr.isReadonlyArrayNonEmpty(skills)) {
    return [
      problemAt(
        manifest,
        `is published without TanStack Intent skills. Write the tasks an agent needs for this package as ${SKILLS}/<task>/${SKILL_FILE} with vp exec intent maintainer add, so agents in the repositories that install it load guidance for the installed version.`,
      ),
    ];
  }
  const validation = yield* validationOf(directory).pipe(
    Effect.orElseSucceed(() => Option.none<string>()),
  );
  return [
    ...pipe(
      packagingMessages(project, skills),
      Arr.map((message) => problemAt(manifest, message)),
    ),
    ...pipe(
      validation,
      Option.map((output) =>
        problemAt(files.join(directory, SKILLS), `fails intent validate:\n${output}`),
      ),
      Option.toArray,
    ),
  ];
});

/** @internal */
export const checkPublishedSkills = Effect.fn("checkPublishedSkills")(
  function* checkPublishedSkills(root: string) {
    const projects = yield* publishedProjects(root);
    const problems = yield* Effect.forEach(projects, (project) => problemsIn(root, project), {
      concurrency: 1,
    });
    return Arr.flatten(problems);
  },
);
