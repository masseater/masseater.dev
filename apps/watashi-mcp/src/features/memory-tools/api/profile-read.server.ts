import { Array as Arr, Effect, Option } from "effect";

import type { Body } from "#/entities/life-record/index.ts";
import type { WatashiProfileValue } from "#/entities/memory/index.ts";
import { embedTexts, traitDetail } from "#/entities/trait/index.server.ts";
import type { Vector } from "#/entities/trait/index.ts";
import type { ToolFailure } from "#/shared/api/index.ts";

import { ownerProfile } from "./watashi-profile.server.ts";

const topicVector = (
  topic: Option.Option<string>,
): Effect.Effect<Option.Option<Vector>, ToolFailure> =>
  Option.match(topic, {
    onNone: () => Effect.succeedNone,
    onSome: (text) => embedTexts([text]).pipe(Effect.map(Arr.head)),
  });

const profileOf = (input: WatashiProfileValue): Effect.Effect<Body, ToolFailure> =>
  topicVector(Option.fromUndefinedOr(input.topic)).pipe(
    Effect.flatMap((topic) => ownerProfile({ scope: Option.fromUndefinedOr(input.scope), topic })),
  );

export const watashiProfile = (input: WatashiProfileValue): Effect.Effect<Body, ToolFailure> =>
  Option.match(Option.fromUndefinedOr(input.trait), {
    onSome: traitDetail,
    onNone: () => profileOf(input),
  });
