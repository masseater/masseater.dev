import { Array as Arr, Effect, Option, Result, Schema, pipe } from "effect";

import { InvalidRecord } from "#/features/mcp/model/invalid-record";
import {
  EventKindBody,
  LifeEventBody,
  MediaItemBody,
  MetricDefinitionBody,
  MetricGoalBody,
  OwnerReflectionBody,
  ProfileFactBody,
  TodoBody,
} from "#/features/mcp/model/life-body";
import type { LifeRecordName } from "#/features/mcp/model/life-record.table";

import { checkMediaIds } from "./life-media-ids";
import { isLifeRecord, normalizeTimes, parseRef } from "./life-record";
import type { Body, Normalized } from "./life-record";
import type { IdKey } from "./life-store.server";
import type { Notice } from "./life-vocabulary.server";

type ItemResult = Readonly<{ ref: string; notices: readonly Notice[] }>;

type Validate = (input: unknown) => Effect.Effect<Body, Schema.SchemaError>;

const STRICT = { onExcessProperty: "error" } as const;

const VALIDATORS: Readonly<Record<LifeRecordName, Validate>> = {
  life_event: Schema.decodeUnknownEffect(LifeEventBody, STRICT),
  media_item: Schema.decodeUnknownEffect(MediaItemBody, STRICT),
  profile_fact: Schema.decodeUnknownEffect(ProfileFactBody, STRICT),
  metric_goal: Schema.decodeUnknownEffect(MetricGoalBody, STRICT),
  owner_reflection: Schema.decodeUnknownEffect(OwnerReflectionBody, STRICT),
  todo: Schema.decodeUnknownEffect(TodoBody, STRICT),
  event_kind: Schema.decodeUnknownEffect(EventKindBody, STRICT),
  metric_definition: Schema.decodeUnknownEffect(MetricDefinitionBody, STRICT),
};

const invalid = (message: string): InvalidRecord => InvalidRecord.make({ message });

const accept = (body: Body): Effect.Effect<Body, InvalidRecord> => Effect.succeed(body);

const EXTRA_CHECKS: Readonly<
  Record<LifeRecordName, (body: Body) => Effect.Effect<Body, InvalidRecord>>
> = {
  life_event: accept,
  media_item: checkMediaIds(invalid),
  profile_fact: accept,
  metric_goal: accept,
  owner_reflection: accept,
  todo: accept,
  event_kind: accept,
  metric_definition: accept,
};

const normalize =
  (record: LifeRecordName) =>
  (body: Body): Effect.Effect<Normalized, InvalidRecord> =>
    pipe(normalizeTimes(record)(body), Result.mapError(invalid), Effect.fromResult);

const validateBody =
  (record: LifeRecordName) =>
  (body: Body): Effect.Effect<Body, InvalidRecord> =>
    VALIDATORS[record](body).pipe(
      Effect.mapError((failure) => invalid(`${record} is not valid: ${failure.message}`)),
      Effect.flatMap(EXTRA_CHECKS[record]),
    );

const assumedNotices =
  (ref: string) =>
  (assumed: readonly string[]): readonly Notice[] =>
    Arr.match(assumed, {
      onEmpty: () => [],
      onNonEmpty: (fields) => [
        {
          type: "assumed_time_zone",
          ref,
          fields,
          note: "The time had no zone, so it was read as Asia/Tokyo.",
        },
      ],
    });

const lifeKeyOf = (ref: string): Effect.Effect<IdKey, InvalidRecord> =>
  pipe(
    parseRef(ref),
    Option.flatMap((parsed) =>
      pipe(
        Option.liftPredicate(parsed.record, isLifeRecord),
        Option.map((record): IdKey => ({ record, id: parsed.id })),
      ),
    ),
    Effect.fromOption,
    Effect.mapError(() =>
      invalid(`${ref} is not a life record. Change work memos (memory:N) with memory_write.`),
    ),
  );

export { assumedNotices, invalid, lifeKeyOf, normalize, validateBody };
export type { ItemResult };
