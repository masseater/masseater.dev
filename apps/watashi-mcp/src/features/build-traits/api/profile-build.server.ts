import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { Hex } from "effect/encoding";

import { isUserMd, parseUserMd, ProfileAuthor, renderUserMd } from "#/entities/owner-profile";
import type { ProfileSection } from "#/entities/owner-profile";
import { latestProfile, saveProfile } from "#/entities/owner-profile/index.server";
import { TraitTranslator } from "#/entities/trait";
import type { StorageFailed } from "#/shared/db";
import { encodeJson, nowIso } from "#/shared/db/index.server";

import { profileSource } from "./profile-source.server.ts";

export type ProfileOutcome = "unchanged" | "written" | "rejected";

export type ProfileFailure = StorageFailed | UpstreamFailed;

const BULLET = "- ";

const bulletsOf = (section: ProfileSection): string =>
  pipe(
    section.lines,
    Arr.map((line) => `${BULLET}${line.text}`),
    Arr.join("\n"),
  );

const translatedLines = (japanese: string): readonly string[] =>
  pipe(
    Str.split(japanese, "\n"),
    Arr.map(Str.trim),
    Arr.filter(Str.startsWith(BULLET)),
    Arr.map(Str.slice(BULLET.length)),
  );

const pairedWith =
  (section: ProfileSection) =>
  (lines: readonly string[]): ProfileSection => {
    if (lines.length !== section.lines.length) {
      return {
        title: section.title,
        lines: pipe(
          lines,
          Arr.map((text) => ({ text, refs: [] })),
        ),
      };
    }
    return {
      title: section.title,
      lines: Arr.zipWith(lines, section.lines, (text, english) => ({ text, refs: english.refs })),
    };
  };

const translateSection = (
  section: ProfileSection,
): Effect.Effect<ProfileSection, UpstreamFailed, TraitTranslator> =>
  Effect.gen(function* translateOne() {
    const translator = yield* TraitTranslator;
    const japanese = yield* translator.toJapanese(bulletsOf(section));
    return pairedWith(section)(translatedLines(japanese));
  });

const save = (
  sections: readonly ProfileSection[],
  sourceHash: string,
): Effect.Effect<ProfileOutcome, ProfileFailure, TraitTranslator> =>
  Effect.gen(function* saveWritten() {
    const japanese = yield* pipe(sections, Effect.forEach(translateSection));
    const builtAt = yield* nowIso;
    yield* saveProfile({
      sourceHash,
      markdown: renderUserMd(sections),
      markdownJa: renderUserMd(japanese),
      builtAt,
    });
    return "written" as const;
  });

const authored = (
  input: string,
  sourceHash: string,
): Effect.Effect<ProfileOutcome, ProfileFailure, ProfileAuthor | TraitTranslator> =>
  Effect.gen(function* authorProfile() {
    const author = yield* ProfileAuthor;
    const markdown = yield* author.write(input);
    const sections = parseUserMd(Str.trim(markdown));
    if (!isUserMd(sections)) {
      yield* Effect.logWarning("watashi.profile.rejected").pipe(Effect.annotateLogs({ markdown }));
      return "rejected" as const;
    }
    return yield* save(sections, sourceHash);
  });

const hashOf = (text: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))).pipe(
    Effect.map((digest) => Hex.encode(new Uint8Array(digest))),
  );

export const buildProfile: Effect.Effect<
  ProfileOutcome,
  ProfileFailure,
  ProfileAuthor | TraitTranslator
> = Effect.gen(function* buildUserMd() {
  const source = yield* profileSource;
  const input = yield* encodeJson(source);
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
  return yield* authored(input, sourceHash);
}).pipe(Effect.withSpan("watashi.profile.build"));
