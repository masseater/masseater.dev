import { Schema } from "effect";

export const RULE_SECTIONS = ["limits", "work", "communication", "who", "repo"] as const;

export const EDITED_SECTIONS = ["limits", "work", "communication", "repo"] as const;

export type RuleSection = (typeof RULE_SECTIONS)[number];

const Repo = Schema.String.annotate({
  description:
    "The repository or app name the rule applies to, such as masseater.dev, when section is repo. An empty string otherwise",
});

const Ids = Schema.Array(Schema.String).annotate({
  description: "The ids of every rule this line comes from, such as R12",
});

const MergedRule = Schema.Struct({
  section: Schema.Literals(RULE_SECTIONS),
  repo: Repo,
  rule: Schema.NonEmptyString.annotate({ description: "One short imperative sentence" }),
  refs: Schema.Array(Schema.Int).annotate({
    description: "The refs of every trait merged into this rule",
  }),
});

export const Merged = Schema.Struct({ rules: Schema.Array(MergedRule) });

export type MergedValue = typeof Merged.Type;

const Item = Schema.Struct({ text: Schema.NonEmptyString, ids: Ids });

export type ItemValue = typeof Item.Type;

const Topic = Schema.Struct({
  title: Schema.NonEmptyString.annotate({ description: "One to three words" }),
  items: Schema.Array(Item),
});

const EditedSection = Schema.Struct({
  section: Schema.Literals(EDITED_SECTIONS),
  repo: Repo,
  topics: Schema.Array(Topic),
});

export type EditedSectionValue = typeof EditedSection.Type;

export const Edited = Schema.Struct({
  summary: Schema.Array(Schema.NonEmptyString),
  who: Schema.Array(Item),
  now: Schema.Array(Schema.NonEmptyString),
  sections: Schema.Array(EditedSection),
});

export type EditedValue = typeof Edited.Type;

export type TraitInput = Readonly<{
  ref: number;
  kind: string;
  limited: boolean;
  statement: string;
  supports: number;
  contradicts: number;
  lastSeen: string;
}>;

export type Rule = Readonly<{
  id: number;
  section: RuleSection;
  repo: string;
  rule: string;
  refs: readonly number[];
  weight: number;
}>;
