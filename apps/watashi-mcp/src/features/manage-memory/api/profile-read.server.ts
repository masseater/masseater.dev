import { Array as Arr, Effect, Option } from "effect";

import type { Body } from "#/entities/life-record/index.ts";
import type { WatashiProfileValue } from "#/entities/memory/index.ts";
import type { Embedder } from "#/entities/trait/index.server.ts";
import { embedTexts, profileTraits, traitDetail } from "#/entities/trait/index.server.ts";
import type { ToolFailure } from "#/shared/api/index.ts";
import type { Database } from "#/shared/db/index.server.ts";

import { userMd } from "./profile-document.server.ts";

export type ProfileServices = Database | Embedder;

const nearTopic = (
  input: WatashiProfileValue,
  topic: string,
): Effect.Effect<Body, ToolFailure, ProfileServices> =>
  embedTexts([topic]).pipe(
    Effect.map(Arr.head),
    Effect.flatMap((vector) =>
      profileTraits({ scope: Option.fromUndefinedOr(input.scope), topic: vector }).pipe(
        Effect.map((traits) => ({ traits })),
      ),
    ),
  );

const documentOrTopic = (
  input: WatashiProfileValue,
): Effect.Effect<Body | string, ToolFailure, ProfileServices> =>
  Option.match(Option.fromUndefinedOr(input.topic), {
    onNone: () => userMd(Option.fromUndefinedOr(input.scope)),
    onSome: (topic) => nearTopic(input, topic),
  });

export const watashiProfile = (
  input: WatashiProfileValue,
): Effect.Effect<Body | string, ToolFailure, ProfileServices> =>
  Option.match(Option.fromUndefinedOr(input.trait), {
    onSome: traitDetail,
    onNone: () => documentOrTopic(input),
  });
