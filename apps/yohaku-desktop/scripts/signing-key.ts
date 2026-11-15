import { gh, run } from "@masseater.dev/component-release";
import { runMain } from "@masseater.dev/node-main";
import { Array as Arr, Config, Effect, FileSystem, Path, String as Str, pipe } from "effect";

const ENVIRONMENT = "yohaku-release";
const SECRET = "TAURI_SIGNING_PRIVATE_KEY";
const KEY = "yohaku.key";

const refuseReplacing = Effect.fn("signingKey.refuseReplacing")(function* refuseReplacing(
  environment: string,
) {
  const present = yield* gh(["api", `${environment}/secrets`, "--jq", ".secrets[].name"]);
  const exists = pipe(present, Str.split("\n"), Arr.contains(SECRET));
  if (!exists) {
    return present;
  }
  return yield* Effect.die(
    "The signing key already exists. Installed apps trust its public key, so it is not replaced.",
  );
});

const generate = Effect.gen(function* generate() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const directory = yield* fileSystem.makeTempDirectoryScoped();
  const key = path.join(directory, KEY);
  yield* run({ file: "tauri", args: ["signer", "generate", "--ci", "-w", key] });
  const privateKey = yield* fileSystem.readFileString(key);
  const publicKey = yield* fileSystem.readFileString(`${key}.pub`);
  return { privateKey, publicKey: Str.trim(publicKey) };
});

runMain("yohaku-signing-key")(
  Effect.gen(function* signingKey() {
    const fileSystem = yield* FileSystem.FileSystem;
    const repository = yield* Config.String("GITHUB_REPOSITORY");
    const environment = `repos/${repository}/environments/${ENVIRONMENT}`;
    yield* gh(["api", "-X", "PUT", environment]);
    yield* refuseReplacing(environment);
    const { privateKey, publicKey } = yield* generate;
    const scope = ["--env", ENVIRONMENT, "--repo", repository];
    yield* gh(["secret", "set", SECRET, ...scope, "--body", privateKey]);
    const summary = yield* Config.String("GITHUB_STEP_SUMMARY");
    yield* fileSystem.writeFileString(summary, `\`${publicKey}\`\n`, { flag: "a" });
  }).pipe(Effect.scoped),
);
