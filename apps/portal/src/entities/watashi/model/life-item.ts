import { Array as Arr, Option, Schema, String as Str, pipe } from "effect";

import { TimeOut } from "#/shared/model";

const Names = Schema.Array(Schema.String);

export const LifeItem = Schema.Struct({
  ref: Schema.String,
  source: Schema.String,
  text: Schema.optionalKey(Schema.String),
  title: Schema.optionalKey(Schema.String),
  statement: Schema.optionalKey(Schema.String),
  name: Schema.optionalKey(Schema.String),
  topic: Schema.optionalKey(Schema.String),
  kind: Schema.optionalKey(Schema.String),
  mediaType: Schema.optionalKey(Schema.String),
  status: Schema.optionalKey(Schema.String),
  creator: Schema.optionalKey(Schema.String),
  place: Schema.optionalKey(Schema.String),
  at: Schema.optionalKey(TimeOut),
  since: Schema.optionalKey(TimeOut),
  due: Schema.optionalKey(TimeOut),
  people: Schema.optionalKey(Names),
  tags: Schema.optionalKey(Names),
});

export const LifePage = Schema.Struct({ total: Schema.Int, items: Schema.Array(LifeItem) });

export type LifeItemValue = typeof LifeItem.Type;

const RECORD_LABELS: Readonly<Record<string, string>> = {
  life_event: "出来事",
  media_item: "作品",
  profile_fact: "事実",
  metric_goal: "目標",
  owner_reflection: "振り返り",
  todo: "ToDo",
  event_kind: "種類",
  metric_definition: "指標",
};

const recordOf = (ref: string): string => pipe(ref, Str.split(":"), Arr.headNonEmpty);

export const recordLabel = (ref: string): string => RECORD_LABELS[recordOf(ref)] ?? recordOf(ref);

export const headline = (item: LifeItemValue): string =>
  pipe(
    [item.text, item.title, item.statement, item.name],
    Arr.map(Option.fromUndefinedOr),
    Option.firstSomeOf,
    Option.getOrElse(() => item.ref),
  );

export const labelsOf = (item: LifeItemValue): readonly string[] =>
  Arr.getSomes([
    Option.fromUndefinedOr(item.kind),
    Option.fromUndefinedOr(item.mediaType),
    Option.fromUndefinedOr(item.topic),
    Option.fromUndefinedOr(item.status),
    Option.fromUndefinedOr(item.place),
    ...pipe(item.people ?? [], Arr.map(Option.some)),
    ...pipe(item.tags ?? [], Arr.map(Option.some)),
  ]);
