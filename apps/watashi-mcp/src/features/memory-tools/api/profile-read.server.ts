import { Array as Arr, Effect, Option } from "effect";

import type { Body } from "#/entities/life-record";
import type { WatashiProfileValue } from "#/entities/memory";
import { embedTexts, profileTraits, traitDetail } from "#/entities/trait/index.server";
import type { ToolFailure } from "#/shared/api";

import { userMd } from "./profile-document.server.ts";

const nearTopic = (input: WatashiProfileValue, topic: string): Effect.Effect<Body, ToolFailure> =>
  embedTexts([topic]).pipe(
    Effect.map(Arr.head),
    Effect.flatMap((vector) =>
      profileTraits({ scope: Option.fromUndefinedOr(input.scope), topic: vector }).pipe(
        Effect.map((traits) => ({ traits })),
      ),
    ),
  );

const documentOrTopic = (input: WatashiProfileValue): Effect.Effect<Body | string, ToolFailure> =>
  Option.match(Option.fromUndefinedOr(input.topic), {
    onNone: () => userMd(Option.fromUndefinedOr(input.scope)),
    onSome: (topic) => nearTopic(input, topic),
  });

export const watashiProfile = (
  input: WatashiProfileValue,
): Effect.Effect<Body | string, ToolFailure> =>
  Option.match(Option.fromUndefinedOr(input.trait), {
    onSome: traitDetail,
    onNone: () => documentOrTopic(input),
  });
