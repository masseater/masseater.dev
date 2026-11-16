import { Array as Arr, Match, Option, pipe } from "effect";

import { fractionOf } from "#/shared/lib/ticks.ts";
import { isExpression } from "#generated/langium/ast.ts";
import type {
  Attribute,
  Bar,
  Binding,
  Chord,
  Each,
  Event,
  Expression,
  Head,
  Line,
  Note,
  Rest,
  Sounding,
} from "#generated/langium/ast.ts";

import type { From } from "./problem.ts";
import { pitchText } from "./values.ts";
import type { Value } from "./values.ts";

export interface Failure {
  readonly node: Expression;
  readonly message: string;
}

export interface Env {
  readonly value: From<Expression, Value>;
  readonly with: From<readonly [Binding, Value], Env>;
  readonly fail: From<Failure, void>;
}

const UNREADABLE = "?";

const noteFrom: From<Head, From<Value, Note>> = (head) => (value) => {
  if (value.kind === "pitch") {
    return { ...head, $type: "Note", pitch: pitchText(value) };
  }
  return { ...head, $type: "Note", pitch: UNREADABLE };
};

const headOf: From<Env, From<Head, Head>> = (env) => (head) => {
  if (head.$type !== "Computed") {
    return head;
  }
  const value = env.value(head.value);
  if (value.kind === "list") {
    const chord: Chord = {
      ...head,
      $type: "Chord",
      notes: pipe(
        value.items,
        Arr.map((item) => noteFrom(head)(item)),
      ),
    };
    return chord;
  }
  return noteFrom(head)(value);
};

const durationOf: From<Env, From<Expression, Option.Option<string>>> = (env) => (node) => {
  const value = env.value(node);
  if (value.kind === "duration") {
    return Option.some(fractionOf(value.ticks));
  }
  env.fail({ node, message: "音価になりません" });
  return Option.none();
};

const withDuration =
  <Timed extends Sounding | Rest>(env: Env) =>
  (timed: Timed): Timed =>
    pipe(
      Option.fromNullishOr(timed.computedDuration),
      Option.flatMap(durationOf(env)),
      Option.match({
        onNone: () => timed,
        onSome: (duration) => ({ ...timed, duration }),
      }),
    );

const attributeOf: From<Env, From<Attribute, Attribute>> = (env) => (attribute) => {
  if (attribute.$type !== "Velocity" || !isExpression(attribute.computed)) {
    return attribute;
  }
  const value = env.value(attribute.computed);
  if (value.kind !== "number") {
    return attribute;
  }
  return { ...attribute, value: value.value };
};

const soundingOf: From<Env, From<Sounding, Sounding>> = (env) => (sounding) =>
  withDuration<Sounding>(env)({
    ...sounding,
    head: headOf(env)(sounding.head),
    attributes: pipe(
      sounding.attributes,
      Arr.map((attribute) => attributeOf(env)(attribute)),
    ),
  });

const passesOf: From<Env, From<Each, readonly Env[]>> = (env) => (each) => {
  const items = env.value(each.items);
  if (items.kind !== "list") {
    env.fail({ node: each.items, message: "each にはリストを渡します" });
    return [];
  }
  return pipe(
    items.items,
    Arr.map((item) => env.with([each, item])),
  );
};

const eventsOf: From<Env, From<readonly Event[], Event[]>> = (env) => (events) =>
  pipe(
    events,
    Arr.flatMap((event) =>
      Match.value(event).pipe(
        Match.discriminatorsExhaustive("$type")({
          Sounding: (sounding): readonly Event[] => [soundingOf(env)(sounding)],
          Rest: (rest): readonly Event[] => [withDuration<Rest>(env)(rest)],
          Tuplet: (tuplet): readonly Event[] => [
            { ...tuplet, events: eventsOf(env)(tuplet.events) },
          ],
          Each: (each): readonly Event[] =>
            pipe(
              passesOf(env)(each),
              Arr.flatMap((inner) => eventsOf(inner)(each.events)),
            ),
        }),
      ),
    ),
  );

const lineOf: From<Env, From<Line, Line>> = (env) => (line) => {
  if (line.$type !== "VoiceLine") {
    return line;
  }
  return { ...line, events: eventsOf(env)(line.events) };
};

export const expandBar: From<Env, From<Bar, Bar>> = (env) => (bar) => ({
  ...bar,
  lines: pipe(
    bar.lines,
    Arr.map((line) => lineOf(env)(line)),
  ),
});
