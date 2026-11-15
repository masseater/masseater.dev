import { Option, Schema, pipe } from "effect";

import { TimeOut } from "#/shared/model";

import { LifeItem } from "./life-item";

const Japanese = Schema.Struct({
  statement: Schema.String,
  why: Schema.optionalKey(Schema.String),
});

const Trait = Schema.Struct({
  ref: Schema.String,
  scope: Schema.String,
  statement: Schema.String,
  why: Schema.optionalKey(Schema.String),
  ja: Schema.optionalKey(Japanese),
  supports: Schema.Int,
  contradicts: Schema.optionalKey(Schema.Int),
  lastSeen: Schema.optionalKey(TimeOut),
});

const Person = Schema.Struct({
  name: Schema.String,
  count: Schema.Int,
  lastMet: Schema.optionalKey(Schema.String),
  facts: Schema.Array(LifeItem),
});

const Profile = Schema.Struct({
  ownerFacts: Schema.Array(LifeItem),
  activeGoals: Schema.Array(LifeItem),
  openTodos: Schema.Array(LifeItem),
  people: Schema.Array(Person),
  recentMedia: Schema.Array(LifeItem),
  traits: Schema.Record(Schema.String, Schema.Array(Trait)),
});

type ProfileValue = typeof Profile.Type;

type TraitValue = typeof Trait.Type;

type JapaneseValue = typeof Japanese.Type;

type PersonValue = typeof Person.Type;

const TRAIT_LABELS: Readonly<Record<string, string>> = {
  rule: "決まり",
  preference: "好み",
  stack: "技術",
  workstyle: "働き方",
  communication: "話し方",
  value: "価値観",
  background: "経歴",
};

const traitLabel = (kind: string): string => TRAIT_LABELS[kind] ?? kind;

const japaneseOf = (trait: TraitValue): Option.Option<JapaneseValue> =>
  Option.fromUndefinedOr(trait.ja);

const statementOf = (trait: TraitValue): string =>
  pipe(
    japaneseOf(trait),
    Option.match({ onNone: () => trait.statement, onSome: (ja) => ja.statement }),
  );

const whyOf = (trait: TraitValue): Option.Option<string> =>
  pipe(
    japaneseOf(trait),
    Option.flatMap((ja) => Option.fromUndefinedOr(ja.why)),
    Option.orElse(() => Option.fromUndefinedOr(trait.why)),
  );

export { Profile, statementOf, traitLabel, whyOf };
export type { PersonValue, ProfileValue, TraitValue };
