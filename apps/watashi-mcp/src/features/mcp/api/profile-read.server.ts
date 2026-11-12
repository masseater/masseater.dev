import { Array as Arr, Effect, Option } from "effect";

import type { ToolFailure } from "#/features/mcp/model/tool-failure";

import type { Body } from "./life-record";
import type { WatashiProfileValue } from "./memory-input";
import { embedTexts } from "./trait-embed.server";
import { traitDetail } from "./trait-read.server";
import type { Vector } from "./trait-vector";
import { ownerProfile } from "./watashi-profile.server";

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

const watashiProfile = (input: WatashiProfileValue): Effect.Effect<Body, ToolFailure> =>
  Option.match(Option.fromUndefinedOr(input.trait), {
    onSome: traitDetail,
    onNone: () => profileOf(input),
  });

export { watashiProfile };
