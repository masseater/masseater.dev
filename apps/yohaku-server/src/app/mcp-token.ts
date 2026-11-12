import { Context, Effect, FileSystem, Layer, Path, Redacted, String } from "effect";
import { SecureRandom } from "effect/crypto";
import { Hex } from "effect/encoding";

import { Settings } from "#shared/settings";

const TOKEN_FILE = "mcp-token";
const TOKEN_BYTES = 32;
const OWNER_ONLY = 0o600;

class McpToken extends Context.Service<McpToken, Redacted.Redacted>()(
  "yohaku-server/app/mcp-token/McpToken",
) {}

const storedOrFresh = Effect.fn("storedOrFresh")(function* storedOrFresh(file: string) {
  const fs = yield* FileSystem.FileSystem;
  const stored = yield* fs.readFileString(file).pipe(
    Effect.map(String.trim),
    Effect.orElseSucceed(() => String.empty),
  );
  if (String.isNonEmpty(stored)) {
    return stored;
  }
  const random = yield* SecureRandom.SecureRandom;
  const bytes = yield* random.randomBytes(TOKEN_BYTES);
  const token = Hex.encode(bytes);
  yield* fs.writeFileString(file, token, { mode: OWNER_ONLY });
  return token;
});

/** @internal */
const mcpTokenLayer = Layer.effect(
  McpToken,
  Effect.gen(function* mcpToken() {
    const { dataDirectory } = yield* Settings;
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* fs.makeDirectory(dataDirectory, { recursive: true });
    const token = yield* storedOrFresh(path.join(dataDirectory, TOKEN_FILE));
    return Redacted.make(token);
  }),
);

export { McpToken, mcpTokenLayer };
