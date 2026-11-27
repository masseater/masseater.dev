import { Effect, Option, pipe } from "effect";
import { Hex } from "effect/encoding";

import { latestProfile } from "#/entities/owner-profile/index.server.ts";
import type { ProfileAuthor } from "#/entities/owner-profile/index.ts";
import type { TraitTranslator } from "#/entities/trait/index.ts";
import type { Database } from "#/shared/db/index.server.ts";
import { encodeJson } from "#/shared/db/index.server.ts";

import type { ProfileFailure, ProfileOutcome } from "./profile-save.server.ts";
import { profileSource } from "./profile-source.server.ts";
import { PROFILE_INSTRUCTIONS, writeProfile } from "./profile-write.server.ts";

const hashOf = (text: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))).pipe(
    Effect.map((digest) => Hex.encode(new Uint8Array(digest))),
  );

export const buildProfile: Effect.Effect<
  ProfileOutcome,
  ProfileFailure,
  ProfileAuthor | TraitTranslator | Database
> = Effect.gen(function* buildUserMd() {
  const source = yield* profileSource;
  const input = yield* encodeJson({ instructions: PROFILE_INSTRUCTIONS, source });
  const sourceHash = yield* hashOf(input);
  const latest = yield* latestProfile;
  if (
    pipe(
      latest,
      Option.exists((row) => row.sourceHash === sourceHash),
    )
  ) {
    return "unchanged" as const;
  }
  return yield* writeProfile({ source, sourceHash });
}).pipe(Effect.withSpan("watashi.profile.build"));
