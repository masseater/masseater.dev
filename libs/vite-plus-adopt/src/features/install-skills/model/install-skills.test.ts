import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils";
import {
  Array as Arr,
  ConfigProvider,
  Effect,
  Exit,
  FileSystem,
  Option,
  Path,
  Ref,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError, Scope } from "effect";
import { HttpClient, HttpClientResponse } from "effect/http";
import type { HttpClientRequest } from "effect/http";
import type { ChildProcessSpawner } from "effect/process";
import { TestClock } from "effect/testing";

import { directoryWith, lines, tarGzArchive } from "#/shared/lib/fixture.test.support.ts";

import { SkillCacheDirectory } from "./cache.ts";
import { installSkills } from "./install-skills.ts";

type FixtureServices =
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | Path.Path
  | Scope.Scope;

type InstallFailure = Effect.Error<ReturnType<typeof installSkills>>;

type InstallExit = Exit.Exit<Option.Option<number>, InstallFailure>;

const SHA_LENGTH = 40;
const COMMIT = Str.repeat(SHA_LENGTH)("a");
const TOP = `skills-${COMMIT}`;
const NONE = 0;
const ONE = 1;
const TWO = 2;
const READ_ONLY_EXECUTABLE = 0o555;
const PERMISSIONS = 0o1000;
const UNAVAILABLE = 503;

const skill = (name: string): string =>
  lines("---", `name: ${name}`, "description: x", "---", `# ${name}`);

const ARCHIVE = {
  [`${TOP}/skills/alpha/SKILL.md`]: skill("alpha"),
  [`${TOP}/skills/alpha/references/notes.md`]: "notes\n",
  [`${TOP}/skills/alpha/examples/inner/SKILL.md`]: skill("inner"),
  [`${TOP}/skills/renamed/SKILL.md`]: skill("beta"),
  [`${TOP}/other/gamma/SKILL.md`]: skill("gamma"),
};

const configWith = (skills: string): string =>
  lines(
    "export default {",
    `  skills: { "owner/skills": { commit: "${COMMIT}", ${skills} } },`,
    "};",
  );

interface Run {
  readonly root: string;
  readonly cache: string;
  readonly requests: Ref.Ref<number>;
}

const prepare = (
  config: string,
  files: Readonly<Record<string, string>> = {},
): Effect.Effect<Run, never, FixtureServices> =>
  Effect.gen(function* prepareRun() {
    const fs = yield* FileSystem.FileSystem;
    const root = yield* directoryWith({
      ...files,
      "vite.config.ts": config,
      ".agents/skills/.gitkeep": "",
    });
    const cache = yield* fs
      .makeTempDirectoryScoped({ prefix: "vpa-skill-cache-" })
      .pipe(Effect.orDie);
    const requests = yield* Ref.make(NONE);
    return { root, cache, requests };
  });

const respondWith =
  (requests: Ref.Ref<number>, archive: Uint8Array) =>
  (
    request: HttpClientRequest.HttpClientRequest,
  ): Effect.Effect<HttpClientResponse.HttpClientResponse> => {
    const body = new Response(new Uint8Array(archive));
    const response = HttpClientResponse.fromWeb(request, body);
    return Ref.update(requests, (count) => count + ONE).pipe(Effect.as(response));
  };

const respondUnavailableFirst =
  (requests: Ref.Ref<number>, archive: Uint8Array) =>
  (
    request: HttpClientRequest.HttpClientRequest,
  ): Effect.Effect<HttpClientResponse.HttpClientResponse> =>
    Effect.gen(function* respondAfterOutage() {
      const earlier = yield* Ref.getAndUpdate(requests, (count) => count + ONE);
      if (earlier === NONE) {
        return HttpClientResponse.fromWeb(request, new Response("", { status: UNAVAILABLE }));
      }
      return HttpClientResponse.fromWeb(request, new Response(new Uint8Array(archive)));
    });

const install = (
  { root, cache, requests }: Run,
  respond: typeof respondWith = respondWith,
): Effect.Effect<InstallExit, never, FixtureServices> =>
  Effect.gen(function* runInstall() {
    const archive = yield* tarGzArchive(ARCHIVE);
    const client = HttpClient.make(respond(requests, archive));
    return yield* installSkills(root).pipe(
      Effect.provideService(HttpClient.HttpClient, client),
      Effect.provideService(SkillCacheDirectory, Option.some(cache)),
      Effect.provideService(ConfigProvider.ConfigProvider, ConfigProvider.fromEnvRecord({})),
      Effect.exit,
    );
  });

const linkedNames = (
  root: string,
): Effect.Effect<readonly string[], PlatformError.PlatformError, FixtureServices> =>
  Effect.gen(function* readLinked() {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const names = yield* fs.readDirectory(path.join(root, ".agents", "skills"));
    return Arr.sort(names, Str.Order);
  });

const installsSelectedSkills = Effect.gen(function* installsSelectedSkills() {
  const run = yield* prepare(configWith('root: "skills", skills: ["alpha", "beta"]'));
  const exit = yield* install(run);
  deepStrictEqual(exit, Exit.succeed(Option.some(TWO)));
  const names = yield* linkedNames(run.root);
  deepStrictEqual(names, [".gitkeep", "alpha", "beta"]);
});

const linksReadOnlyCachedFiles = Effect.gen(function* linksReadOnlyCachedFiles() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const run = yield* prepare(configWith('root: "skills", skills: ["alpha", "beta"]'));
  yield* install(run);
  const notes = path.join(run.root, ".agents", "skills", "alpha", "references", "notes.md");
  const info = yield* fs.stat(notes);
  strictEqual(info.mode % PERMISSIONS, READ_ONLY_EXECUTABLE);
  const target = yield* fs.readLink(path.join(run.root, ".agents", "skills", "beta"));
  assertTrue(Str.startsWith(run.cache)(target));
});

const allTakesEveryOutermostSkill = Effect.gen(function* allTakesEveryOutermostSkill() {
  const run = yield* prepare(configWith('root: "skills", skills: "all"'));
  yield* install(run);
  const names = yield* linkedNames(run.root);
  deepStrictEqual(names, [".gitkeep", "alpha", "beta"]);
});

const reusesTheCache = Effect.gen(function* reusesTheCache() {
  const run = yield* prepare(configWith('skills: "all"'));
  yield* install(run);
  const second = yield* prepare(configWith('skills: ["gamma"]'));
  yield* install({ ...second, cache: run.cache, requests: run.requests });
  const requests = yield* Ref.get(run.requests);
  strictEqual(requests, ONE);
  const names = yield* linkedNames(second.root);
  deepStrictEqual(names, [".gitkeep", "gamma"]);
});

const replacesUndeclaredLinks = Effect.gen(function* replacesUndeclaredLinks() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const run = yield* prepare(configWith('root: "skills", skills: ["alpha", "beta"]'));
  yield* install(run);
  const narrowed = configWith('root: "skills", skills: ["beta"]');
  yield* fs.writeFileString(path.join(run.root, "vite.config.ts"), narrowed);
  yield* install(run);
  const names = yield* linkedNames(run.root);
  deepStrictEqual(names, [".gitkeep", "beta"]);
});

const failsOnAnUnknownName = Effect.gen(function* failsOnAnUnknownName() {
  const run = yield* prepare(configWith('root: "skills", skills: ["missing"]'));
  const exit = yield* install(run);
  const listsAvailable = pipe(
    Exit.findErrorOption(exit),
    Option.exists(({ message }) => Str.includes("It has: alpha, beta")(message)),
  );
  assertTrue(listsAvailable);
});

const LOCAL_FILES = {
  "docs/skills/delta/SKILL.md": skill("delta"),
  "docs/skills/notes.md": "not a skill\n",
};

const localConfig = (source: string): string =>
  lines(
    "export default {",
    "  skills: {",
    `    "owner/skills": { commit: "${COMMIT}", root: "skills", skills: ["alpha"] },`,
    `    "./docs/skills": ${source},`,
    "  },",
    "};",
  );

const linksLocalFolders = Effect.gen(function* linksLocalFolders() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const run = yield* prepare(localConfig('{ skills: "all" }'), LOCAL_FILES);
  const exit = yield* install(run);
  deepStrictEqual(exit, Exit.succeed(Option.some(TWO)));
  const names = yield* linkedNames(run.root);
  deepStrictEqual(names, [".gitkeep", "alpha", "delta"]);
  const target = yield* fs.readLink(path.join(run.root, ".agents", "skills", "delta"));
  strictEqual(
    path.resolve(run.root, ".agents", "skills", target),
    path.join(run.root, "docs", "skills", "delta"),
  );
});

const rejectsACommitOnALocalFolder = Effect.gen(function* rejectsACommitOnALocalFolder() {
  const run = yield* prepare(localConfig(`{ commit: "${COMMIT}", skills: "all" }`), LOCAL_FILES);
  const exit = yield* install(run);
  const saysNoCommit = pipe(
    Exit.findErrorOption(exit),
    Option.exists(({ message }) => Str.includes("takes no commit")(message)),
  );
  assertTrue(saysNoCommit);
});

const retriesAnUnavailableDownload = Effect.gen(function* retriesAnUnavailableDownload() {
  const run = yield* prepare(configWith('root: "skills", skills: ["alpha"]'));
  const exit = yield* install(run, respondUnavailableFirst);
  deepStrictEqual(exit, Exit.succeed(Option.some(ONE)));
  const requests = yield* Ref.get(run.requests);
  strictEqual(requests, TWO);
});

const doesNothingWithoutASection = Effect.gen(function* doesNothingWithoutASection() {
  const run = yield* prepare(lines("export default {};"));
  const exit = yield* install(run);
  deepStrictEqual(exit, Exit.succeed(Option.none()));
  const requests = yield* Ref.get(run.requests);
  strictEqual(requests, NONE);
});

layer(fixtureLayer)("installing skills", (it) => {
  it.effect("links the selected skills from the cache into .agents/skills", () =>
    Effect.scoped(installsSelectedSkills),
  );
  it.effect("links read-only files in the cache", () => Effect.scoped(linksReadOnlyCachedFiles));
  it.effect("takes every outermost skill under root for all", () =>
    Effect.scoped(allTakesEveryOutermostSkill),
  );
  it.effect("reuses cached skills without downloading again", () => Effect.scoped(reusesTheCache));
  it.effect("removes links that are no longer declared", () =>
    Effect.scoped(replacesUndeclaredLinks),
  );
  it.effect("fails with the available names when a name is missing", () =>
    Effect.scoped(failsOnAnUnknownName),
  );
  it.effect("links skills from a folder in the repository", () => Effect.scoped(linksLocalFolders));
  it.effect("rejects a commit on a folder in the repository", () =>
    Effect.scoped(rejectsACommitOnALocalFolder),
  );
  it.effect("downloads again after GitHub answers 503", () =>
    retriesAnUnavailableDownload.pipe(Effect.scoped, TestClock.withLive),
  );
  it.effect("does nothing without a skills section", () =>
    Effect.scoped(doesNothingWithoutASection),
  );
});
