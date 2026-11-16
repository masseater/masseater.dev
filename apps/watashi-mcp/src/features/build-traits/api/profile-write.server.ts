import { Array as Arr, Effect, Option, Schema } from "effect";

import { isUserMd, ProfileAuthor, renderUserMd } from "#/entities/owner-profile/index.ts";
import type { TraitTranslator } from "#/entities/trait/index.ts";
import { assemble } from "#/features/build-traits/model/profile-assemble.ts";
import { Edited, Merged } from "#/features/build-traits/model/profile-outline.ts";
import { editInputOf, rulesOf } from "#/features/build-traits/model/profile-rules.ts";
import { encodeJson } from "#/shared/db/index.server.ts";

import { EDIT_INSTRUCTIONS, MERGE_INSTRUCTIONS } from "./profile-prompt.ts";
import { saveTranslated } from "./profile-save.server.ts";
import type { ProfileFailure, ProfileOutcome } from "./profile-save.server.ts";
import type { ProfileSource } from "./profile-source.server.ts";

type Writing = Effect.Effect<ProfileOutcome, ProfileFailure, ProfileAuthor | TraitTranslator>;

type Draft = Readonly<{
  source: ProfileSource;
  sourceHash: string;
  merged: typeof Merged.Type;
}>;

const MERGE_FORMAT = Schema.toJsonSchemaDocument(Merged).schema;

const EDIT_FORMAT = Schema.toJsonSchemaDocument(Edited).schema;

const decodeMerged = Schema.decodeUnknownOption(Schema.fromJsonString(Merged));

const decodeEdited = Schema.decodeUnknownOption(Schema.fromJsonString(Edited));

const rejected = (step: string, text: string): Effect.Effect<ProfileOutcome> =>
  Effect.logWarning("watashi.profile.rejected").pipe(
    Effect.annotateLogs({ step, text }),
    Effect.as("rejected" as const),
  );

const saveAssembled =
  ({ source, sourceHash, merged }: Draft) =>
  (edited: typeof Edited.Type): Effect.Effect<ProfileOutcome, ProfileFailure, TraitTranslator> => {
    const rules = rulesOf({ merged, traits: source.traits });
    const bare = Arr.isReadonlyArrayNonEmpty(source.ownerFacts);
    const { sections, used, rescued } = assemble({ rules, edited, bare });
    const counted = Effect.annotateCurrentSpan({
      "watashi.profile.traits": source.traits.length,
      "watashi.profile.rules": rules.length,
      "watashi.profile.rules_used": used,
      "watashi.profile.rules_rescued": rescued,
    });
    if (!isUserMd(sections)) {
      const shown = rejected("assemble", renderUserMd(sections));
      return counted.pipe(Effect.andThen(shown));
    }
    const saved = saveTranslated({ sections, sourceHash });
    return counted.pipe(Effect.andThen(saved));
  };

const edit = (draft: Draft): Writing =>
  Effect.gen(function* editProfile() {
    const author = yield* ProfileAuthor;
    const input = yield* encodeJson({
      rules: editInputOf(rulesOf({ merged: draft.merged, traits: draft.source.traits })),
      ownerFacts: draft.source.ownerFacts,
      recentMemos: draft.source.recentMemos,
    });
    const text = yield* author.write({
      step: "edit",
      instructions: EDIT_INSTRUCTIONS,
      format: EDIT_FORMAT,
      input,
    });
    return yield* Option.match(decodeEdited(text), {
      onNone: () => rejected("edit", text),
      onSome: saveAssembled(draft),
    });
  });

export const writeProfile = ({
  source,
  sourceHash,
}: Readonly<{ source: ProfileSource; sourceHash: string }>): Writing =>
  Effect.gen(function* mergeProfile() {
    const author = yield* ProfileAuthor;
    const input = yield* encodeJson({ traits: source.traits });
    const text = yield* author.write({
      step: "merge",
      instructions: MERGE_INSTRUCTIONS,
      format: MERGE_FORMAT,
      input,
    });
    return yield* Option.match(decodeMerged(text), {
      onNone: () => rejected("merge", text),
      onSome: (merged) => edit({ source, sourceHash, merged }),
    });
  });

export const PROFILE_INSTRUCTIONS: readonly string[] = [MERGE_INSTRUCTIONS, EDIT_INSTRUCTIONS];
