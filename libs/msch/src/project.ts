import { Array as Arr, Effect, Function as Fn, Option, Order, String as Str, pipe } from "effect";

import { API, getLeadingCommentRanges } from "./compiler.ts";
import type { Checker, ParsedCommandLine, Program, SourceFile } from "./compiler.ts";
import {
  MANIFEST_FILE,
  NODE_MODULES,
  dependencyEntries,
  readManifest,
  workspaceDependencies,
} from "./dependencies.ts";
import { libraryIndex } from "./library.ts";
import type { LibraryIndex } from "./library.ts";
import { RepositoryFiles } from "./repository-files.ts";

interface Project {
  readonly packageName: Option.Option<string>;
  readonly workspaceDependencies: readonly string[];
  readonly program: Program;
  readonly checker: Checker;
  readonly sourceFiles: readonly SourceFile[];
  readonly library: LibraryIndex;
}

interface PackageInfo {
  readonly directory: string;
  readonly name: Option.Option<string>;
  readonly workspaceDependencies: readonly string[];
}

const CONFIG_FILE = "tsconfig.json";
const HIDDEN_PREFIX = ".";
const SKIPPED_DIRECTORIES: ReadonlySet<string> = new Set([NODE_MODULES, "dist", "coverage"]);

const listConfigFiles = (
  directory: string,
): Effect.Effect<readonly string[], never, RepositoryFiles> =>
  Effect.gen(function* configFilesUnder() {
    const files = yield* RepositoryFiles;
    const names = yield* files.readDirectory(directory);
    const visible = pipe(
      names,
      Arr.filter((name) => !Str.startsWith(HIDDEN_PREFIX)(name) && !SKIPPED_DIRECTORIES.has(name)),
      Arr.map((name) => files.join(directory, name)),
    );
    const nested = yield* Fn.pipe(
      visible,
      Effect.forEach((entryPath) =>
        files.isDirectory(entryPath).pipe(
          Effect.flatMap(
            Option.match({
              onNone: (): Effect.Effect<readonly string[], never, RepositoryFiles> =>
                Effect.succeed([]),
              onSome: (
                directoryEntry,
              ): Effect.Effect<readonly string[], never, RepositoryFiles> => {
                if (directoryEntry) {
                  return listConfigFiles(entryPath);
                }
                return Effect.succeed(
                  Arr.filter([entryPath], () => files.basename(entryPath) === CONFIG_FILE),
                );
              },
            }),
          ),
        ),
      ),
    );
    return Arr.sort(nested.flat(), Order.String);
  });

const parseConfig =
  (api: API) =>
  (configPath: string): Option.Option<ParsedCommandLine> =>
    Option.some(api.parseConfigFile(configPath)).pipe(
      Option.filter((parsed) => Arr.isReadonlyArrayNonEmpty(parsed.fileNames)),
    );

const nearestPackageDirectory = (
  directory: string,
  root: string,
): Effect.Effect<string, never, RepositoryFiles> =>
  Effect.gen(function* nearestPackage() {
    const files = yield* RepositoryFiles;
    const hasManifest = yield* files.exists(files.join(directory, MANIFEST_FILE));
    const parent = files.dirname(directory);
    if (hasManifest || directory === root || parent === directory) {
      return directory;
    }
    return yield* nearestPackageDirectory(parent, root);
  });

const packageInfoOf = Effect.fn("packageInfoOf")(function* packageInfoOf(
  configPath: string,
  root: string,
) {
  const files = yield* RepositoryFiles;
  const directory = yield* nearestPackageDirectory(files.dirname(configPath), root);
  const manifest = yield* readManifest(directory);
  return {
    directory,
    name: manifest.pipe(Option.flatMap((found) => Option.fromUndefinedOr(found.name))),
    workspaceDependencies: manifest.pipe(
      Option.map(workspaceDependencies),
      Option.getOrElse(() => []),
    ),
  } satisfies PackageInfo;
});

const NO_CHECK_PRAGMA = /^\/\/\s*@ts-nocheck/u;
const FILE_START = 0;

const skipsTypeChecking = (sourceFile: SourceFile): boolean =>
  pipe(
    getLeadingCommentRanges(sourceFile.text, FILE_START) ?? [],
    Arr.some((range) => NO_CHECK_PRAGMA.test(Str.slice(range.pos, range.end)(sourceFile.text))),
  );

const buildProject = Effect.fn("buildProject")(function* buildProject(
  api: API,
  parsed: ParsedCommandLine,
  info: PackageInfo,
) {
  const entries = yield* dependencyEntries(info.directory);
  const program = api.createProgram(
    [
      ...parsed.fileNames,
      ...pipe(
        entries,
        Arr.map((entry) => entry.declarationsPath),
      ),
    ],
    { ...parsed.options, noEmit: true },
  );
  const { checker } = program.getProject();
  const projectFiles: ReadonlySet<string> = new Set(parsed.fileNames);
  return {
    packageName: info.name,
    workspaceDependencies: info.workspaceDependencies,
    program,
    checker,
    sourceFiles: pipe(
      program.getSourceFileNames(),
      Arr.filter((fileName) => projectFiles.has(fileName)),
      Arr.flatMap((fileName) =>
        Option.toArray(Option.fromUndefinedOr(program.getSourceFile(fileName))),
      ),
      Arr.filter((sourceFile) => !sourceFile.isDeclarationFile && !skipsTypeChecking(sourceFile)),
    ),
    library: libraryIndex(checker)(entries),
  } satisfies Project;
});

const typeScriptApi = Effect.acquireRelease(
  Effect.sync(() => new API()),
  (api) =>
    Effect.sync(() => {
      api.close();
    }),
);

const loadProject = Effect.fn("loadProject")(function* loadProject(
  api: API,
  configPath: string,
  root: string,
) {
  const parsed = parseConfig(api)(configPath);
  if (Option.isNone(parsed)) {
    return Option.none<Project>();
  }
  const info = yield* packageInfoOf(configPath, root);
  const project = yield* buildProject(api, parsed.value, info);
  return Option.some(project);
});

const loadProjects = Effect.fn("loadProjects")(function* loadProjects(
  root: string,
  configPaths: readonly string[],
) {
  const api = yield* typeScriptApi;
  const projects = yield* Fn.pipe(
    configPaths,
    Effect.forEach((configPath) => loadProject(api, configPath, root)),
  );
  return Arr.getSomes(projects);
});

export { listConfigFiles, loadProjects };
export type { Project };
