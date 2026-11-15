import { Array as Arr, Effect, Option, Order, Schema, String as Str, pipe } from "effect";
import { parse } from "yaml";

import type { Problem, RuleName } from "./problem.ts";
import { RepositoryFiles } from "./repository-files.ts";
import {
  isScannedText,
  isToolVersions,
  listedFiles,
  presentFiles,
  scanText,
} from "./scanned-files.ts";
import type { Listed } from "./scanned-files.ts";
import { positionOf } from "./text-position.ts";

const WORKSPACE_FILE = "pnpm-workspace.yaml";
const PNPM_DIRECTORY = ".pnpm/";
const SEPARATOR = "/";

const FOREIGN_LOCKFILE =
  /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|bun\.lockb?)$/u;
const CARGO_MANIFEST_FILE = /(?:^|\/)Cargo\.toml$/u;
const CARGO_LOCK_FILE = /(?:^|\/)Cargo\.lock$/u;
const PNPM_OUTPUT = /(?:^|\/)\.pnpm\//u;
const CARGO_WORKSPACE = /^\[workspace\]/mu;
const LEGACY_CARGO_CONFIG = /(?:^|\/)\.cargo\/config$/u;
const CARGO_CONFIG_FILE = /(?:^|\/)\.cargo\/config\.toml$/u;
const PNPM_CARGO_START = /# >>> pnpm-managed cargo sources >>>/u;
const PNPM_CARGO_BLOCK =
  /# >>> pnpm-managed cargo sources >>>[\s\S]*?# <<< pnpm-managed cargo sources <<<\n?/gu;

const SETUP_PATTERNS: readonly RegExp[] = [
  /(?<![\w./@-])rustup[ \t]+(?:toolchain[ \t]+install|install|update|default|override[ \t]+set|target[ \t]+add|component[ \t]+add)\b/gu,
  /(?<![\w./@-])cargo[ \t]+(?:vendor|fetch)\b/gu,
  /\buses:\s*["']?(?:dtolnay\/rust-toolchain|actions-rust-lang\/setup-rust-toolchain|actions-rs\/toolchain|moonrepo\/setup-rust)\b/gu,
];

const TOOL_PATTERNS: readonly RegExp[] = [
  /^[ \t]*["']?(?:rust|rustup)["']?[ \t]*(?:=|[ \t]+\S)/gmu,
];

const START = 0;
const LAST_SEGMENT = 1;
const FIRST_LINE = 1;
const FIRST_COLUMN = 1;
const WHOLE_MATCH = 0;
const FILE_RULE: RuleName = "unneeded-file";
const SETUP_RULE: RuleName = "unneeded-setup";
const CARGO_RULE: RuleName = "cargo-outside-pnpm";

const CargoSettings = Schema.Struct({ enabled: Schema.optionalKey(Schema.Boolean) });
const WorkspaceFile = Schema.Struct({ cargo: Schema.optionalKey(CargoSettings) });
const decodeWorkspaceFile = Schema.decodeUnknownOption(WorkspaceFile);

const cargoEnabled = (text: string): boolean =>
  pipe(
    decodeWorkspaceFile(parse(text)),
    Option.flatMap(({ cargo }) => Option.fromUndefinedOr(cargo)),
    Option.flatMap(({ enabled }) => Option.fromUndefinedOr(enabled)),
    Option.getOrElse(() => false),
  );

const problemAtStart =
  (rule: RuleName, message: string) =>
  ({ file }: Listed): Problem => ({
    file,
    line: FIRST_LINE,
    column: FIRST_COLUMN,
    rule,
    message,
  });

const foreignLockfile = problemAtStart(
  FILE_RULE,
  "pnpm-lock.yaml is this repository's lockfile, and pnpm never reads this one. Delete it.",
);

const nestedCargoLock = problemAtStart(
  FILE_RULE,
  "Cargo reads only the Cargo.lock beside the workspace's Cargo.toml, and pnpm install writes that one. Delete this one.",
);

const legacyCargoConfig = problemAtStart(
  FILE_RULE,
  "pnpm install writes .cargo/config.toml, and Cargo warns when .cargo/config sits beside it. Move its settings into .cargo/config.toml and delete it.",
);

const pnpmOutput = problemAtStart(
  FILE_RULE,
  "pnpm install writes .pnpm/ from Cargo.lock and rust-toolchain.toml. Add this .pnpm directory to .gitignore and keep it out of the repository.",
);

const pnpmCargoConfig = problemAtStart(
  FILE_RULE,
  "pnpm install writes this .cargo/config.toml, and it holds nothing else. Add /.cargo/config.toml to .gitignore and keep it out of the repository.",
);

const generatedCargoConfig = (entry: Listed, source: string): readonly Problem[] => {
  if (!CARGO_CONFIG_FILE.test(entry.name) || !PNPM_CARGO_START.test(source)) {
    return [];
  }
  if (Str.isNonEmpty(Str.trim(Str.replaceAll(PNPM_CARGO_BLOCK, "")(source)))) {
    return [];
  }
  return [pnpmCargoConfig(entry)];
};

const cargoOutsidePnpm = problemAtStart(
  CARGO_RULE,
  `pnpm does not manage these crates. Set \`cargo: { enabled: true }\` in ${WORKSPACE_FILE} so pnpm install fetches the crates and the Rust toolchain.`,
);

const setupProblem =
  ({ file }: Listed, source: string) =>
  (found: RegExpMatchArray): Problem => ({
    file,
    ...positionOf(source)(found.index ?? WHOLE_MATCH),
    rule: SETUP_RULE,
    message: `pnpm install already installs the toolchain in rust-toolchain.toml and vendors the crates in Cargo.lock. Remove \`${Str.trim(found[WHOLE_MATCH])}\`.`,
  });

const setupPatternsFor = (entry: Listed): readonly RegExp[] => {
  if (isToolVersions(entry)) {
    return [...SETUP_PATTERNS, ...TOOL_PATTERNS];
  }
  return SETUP_PATTERNS;
};

const setupProblems = (entry: Listed, source: string): readonly Problem[] =>
  pipe(
    setupPatternsFor(entry),
    Arr.flatMap((pattern) => Arr.fromIterable(Str.matchAll(pattern)(source))),
    Arr.map(setupProblem(entry, source)),
    Arr.appendAll(generatedCargoConfig(entry, source)),
  );

const matches =
  (pattern: RegExp) =>
  ({ name }: Listed): boolean =>
    pattern.test(name);

const isCargoManifest = matches(CARGO_MANIFEST_FILE);
const isForeignLockfile = matches(FOREIGN_LOCKFILE);
const isLegacyCargoConfig = matches(LEGACY_CARGO_CONFIG);
const isPnpmOutput = matches(PNPM_OUTPUT);

const directoryOf = (name: string): string =>
  pipe(Str.split(name, SEPARATOR), Arr.dropRight(LAST_SEGMENT), Arr.join(SEPARATOR));

const ancestorsOf = (directory: string): readonly string[] => {
  const parts = Str.split(directory, SEPARATOR);
  return pipe(
    Arr.makeBy(parts.length, (depth) => Arr.join(Arr.take(parts, depth), SEPARATOR)),
    Arr.filter((ancestor) => ancestor !== directory),
  );
};

const readsCargoLock =
  (manifests: readonly string[], workspaces: readonly string[]) =>
  ({ name }: Listed): boolean => {
    const directory = directoryOf(name);
    const insideWorkspace = pipe(
      ancestorsOf(directory),
      Arr.some((ancestor) => Arr.contains(workspaces, ancestor)),
    );
    return Arr.contains(manifests, directory) && !insideWorkspace;
  };

const isWorkspaceManifest = (source: Option.Option<string>): boolean =>
  Option.exists(source, (text) => CARGO_WORKSPACE.test(text));

const directoriesOf = (entries: readonly Listed[]): readonly string[] =>
  pipe(
    entries,
    Arr.map(({ name }) => directoryOf(name)),
  );

const cargoWorkspaces = Effect.fn("cargoWorkspaces")(function* cargoWorkspaces(
  manifests: readonly Listed[],
) {
  const files = yield* RepositoryFiles;
  const roots = yield* pipe(
    manifests,
    Effect.filter(({ file }) => files.readFile(file).pipe(Effect.map(isWorkspaceManifest))),
  );
  return directoriesOf(roots);
});

const pnpmDirectoryOf = ({ name }: Listed): string =>
  pipe(
    name,
    Str.indexOf(PNPM_DIRECTORY),
    Option.getOrElse(() => START),
    (end) => Str.slice(START, end)(name),
  );

const pnpmOutputs = (present: readonly Listed[]): readonly Problem[] =>
  pipe(
    present,
    Arr.filter(isPnpmOutput),
    Arr.dedupeWith((left, right) => pnpmDirectoryOf(left) === pnpmDirectoryOf(right)),
    Arr.map(pnpmOutput),
  );

const byDepth: Order.Order<Listed> = Order.mapInput(
  Order.Number,
  ({ name }: Listed) => Str.split(name, "/").length,
);

const cargoProblems = (
  present: readonly Listed[],
  enabled: boolean,
): Effect.Effect<readonly Problem[], never, RepositoryFiles> => {
  if (!enabled) {
    return Effect.succeed(
      pipe(
        present,
        Arr.filter(isCargoManifest),
        Arr.match({
          onEmpty: (): readonly Problem[] => [],
          onNonEmpty: (manifests) => [cargoOutsidePnpm(Arr.min(manifests, byDepth))],
        }),
      ),
    );
  }
  return Effect.gen(function* enabledCargoProblems() {
    const manifests = pipe(present, Arr.filter(isCargoManifest));
    const workspaces = yield* cargoWorkspaces(manifests);
    const reads = readsCargoLock(directoriesOf(manifests), workspaces);
    const setup = yield* scanText(pipe(present, Arr.filter(isScannedText)), setupProblems);
    return [
      ...pipe(
        present,
        Arr.filter((entry) => CARGO_LOCK_FILE.test(entry.name) && !reads(entry)),
        Arr.map(nestedCargoLock),
      ),
      ...pipe(present, Arr.filter(isLegacyCargoConfig), Arr.map(legacyCargoConfig)),
      ...pnpmOutputs(present),
      ...setup,
    ];
  });
};

const unneededIn = Effect.fn("unneededIn")(function* unneededIn(root: string, workspace: string) {
  const listed = yield* listedFiles(root);
  const present = yield* presentFiles(listed);
  const lockfiles = pipe(present, Arr.filter(isForeignLockfile), Arr.map(foreignLockfile));
  if (!pipe(present, Arr.some(isCargoManifest))) {
    return lockfiles;
  }
  const cargo = yield* cargoProblems(present, cargoEnabled(workspace));
  return [...lockfiles, ...cargo];
});

/** @internal */
const checkUnneededFiles = Effect.fn("checkUnneededFiles")(function* checkUnneededFiles(
  root: string,
) {
  const files = yield* RepositoryFiles;
  const workspace = yield* files.readFile(files.join(root, WORKSPACE_FILE));
  if (Option.isNone(workspace)) {
    return [];
  }
  return yield* unneededIn(root, workspace.value);
});

export { checkUnneededFiles };
