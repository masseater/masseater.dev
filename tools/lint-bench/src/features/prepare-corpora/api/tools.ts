import { Effect, FileSystem, Path, Record as Rec } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

const PACKAGES = [
  "markdownlint-cli2@0.24.1",
  "remark-cli@12.0.1",
  "remark-preset-lint-recommended@7.0.1",
  "@ls-lint/ls-lint@2.3.2",
  "steiger@0.10.0",
  "@feature-sliced/steiger-plugin@0.8.2",
  "dependency-cruiser@18.8.0",
  "eslint@10.15.0",
  "eslint-plugin-boundaries@7.4.4",
  "eslint-import-resolver-typescript@4.4.5",
  "@typescript-eslint/parser@8.73.0",
  "@softarc/sheriff-core@0.20.0",
];

/** @internal */
export const installNpmTools = Effect.fn("tools.npm")(function* installNpmTools(
  cache: string,
  files: Readonly<Record<string, string>>,
) {
  const path = yield* Path.Path;
  const fileSystem = yield* FileSystem.FileSystem;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const prefix = path.join(cache, "npm");
  yield* fileSystem.makeDirectory(prefix, { recursive: true });
  yield* spawner.string(
    ChildProcess.make(
      "npm",
      ["install", "--prefix", prefix, "--no-audit", "--no-fund", "--save-exact", ...PACKAGES],
      { cwd: prefix },
    ),
  );
  const written = yield* Effect.forEach(
    Rec.toEntries(files),
    ([name, text]) =>
      fileSystem
        .writeFileString(path.join(prefix, name), text)
        .pipe(Effect.as([name, path.join(prefix, name)] as const)),
    { concurrency: "unbounded" },
  );
  return { npm: path.join(prefix, "node_modules"), config: Rec.fromEntries(written) };
});
