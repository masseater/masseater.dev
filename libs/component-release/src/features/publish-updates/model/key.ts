import {
  Array as Arr,
  Config,
  Effect,
  FileSystem,
  Option,
  Path,
  String as Str,
  pipe,
} from "effect";

import { gh, run } from "#/shared/lib/command.ts";

import { environmentOf, manifest } from "./manifest.ts";

const SECRET = "TAURI_SIGNING_PRIVATE_KEY";
const KEY = "updater.key";
const PUBLIC = ".pub";

const hasKey = Effect.fn("updaterKey.hasKey")(function* hasKey(environment: string) {
  const present = yield* gh(["api", `${environment}/secrets`, "--jq", ".secrets[].name"]);
  return pipe(present, Str.split("\n"), Arr.contains(SECRET));
});

const generate = Effect.gen(function* generate() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fileSystem.makeTempDirectoryScoped();
  const key = path.join(directory, KEY);
  yield* run({ file: "tauri", args: ["signer", "generate", "--ci", "-w", key] });
  const privateKey = yield* fileSystem.readFileString(key);
  const publicKey = yield* fileSystem.readFileString(`${key}${PUBLIC}`);
  return { privateKey, publicKey: Str.trim(publicKey) };
});

const store = Effect.fn("updaterKey.store")(function* store(
  repository: string,
  environment: string,
) {
  const { privateKey, publicKey } = yield* generate;
  const scope = ["--env", environment, "--repo", repository];
  yield* gh(["secret", "set", SECRET, ...scope, "--body", privateKey]);
  return publicKey;
});

const report = Effect.fn("updaterKey.report")(function* report(name: string, publicKey: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  yield* Effect.log(`${name} updater public key: ${publicKey}`);
  const summary = yield* Config.String("GITHUB_STEP_SUMMARY");
  yield* fileSystem.writeFileString(summary, `${name}: \`${publicKey}\`\n`, { flag: "a" });
});

const ensureKey = Effect.fn("updaterKey.ensureKey")(function* ensureKey(name: string) {
  const repository = yield* Config.String("GITHUB_REPOSITORY");
  const environment = environmentOf(name);
  const api = `repos/${repository}/environments/${environment}`;
  yield* gh(["api", "-X", "PUT", api]);
  if (yield* hasKey(api)) {
    return Option.none();
  }
  const publicKey = yield* store(repository, environment);
  return Option.some(publicKey);
});

/** @internal */
export const updaterKey = Effect.gen(function* updaterKey() {
  const { name } = yield* manifest;
  const created = yield* ensureKey(name);
  return yield* Option.match(created, {
    onNone: () =>
      Effect.log(`${environmentOf(name)} already has ${SECRET}; installed apps trust it`),
    onSome: (publicKey) => report(name, publicKey),
  });
}).pipe(Effect.scoped);
