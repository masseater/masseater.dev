import { Schema } from "effect";

import { STANCES, TRAIT_KINDS, TRAIT_ORIGINS } from "./owner-trait.table";

const TraitKind = Schema.Literals(TRAIT_KINDS).annotate({
  description:
    "rule: a rule or prohibition the owner wants followed. preference: a taste. stack: technology and tools to use or avoid. workstyle: how work proceeds. communication: how to report and write. value: a judgement criterion. background: the owner's role and environment",
});

const Statement = Schema.NonEmptyString.annotate({
  description:
    "One English sentence an agent can follow as is, even when the source is Japanese. Write rules as imperatives such as 'Do X' or 'Never do X'. Never write Japanese",
});

const Limited = Schema.Boolean.annotate({
  description:
    "true only when the source says the trait applies just to the project or repository named in the source's [brackets]. false when it applies to the owner in general",
});

const Why = Schema.String.annotate({
  description:
    "The reason the source gives, as one English sentence, or an empty string when it gives none. Never write Japanese",
});

const SourceRef = Schema.NonEmptyString.annotate({
  description: "The ref of the source the quote is taken from, exactly as given",
});

const TraitRef = Schema.NonEmptyString.annotate({
  description: "The ref of one of the candidate traits listed for this source, exactly as given",
});

const Quote = Schema.NonEmptyString.annotate({
  description:
    "A verbatim excerpt of the source text that shows the trait. Copy it character by character",
});

const TraitSource = Schema.Struct({
  ref: Schema.String,
  origin: Schema.Literals(TRAIT_ORIGINS),
  at: Schema.String,
  scope: Schema.String,
  text: Schema.String,
});

const AskedSource = Schema.Struct({
  ref: Schema.String,
  text: Schema.String,
  candidates: Schema.Array(Schema.String),
});

const KnownTrait = Schema.Struct({
  ref: Schema.String,
  kind: Schema.Literals(TRAIT_KINDS),
  statement: Schema.String,
});

const AnalysisRequest = Schema.Struct({
  sources: Schema.Array(AskedSource),
  traits: Schema.Array(KnownTrait),
});

const Draft = {
  kind: TraitKind,
  limited: Limited,
  statement: Statement,
  why: Why,
};

const Linked = Schema.Struct({
  action: Schema.Literals(STANCES),
  source: SourceRef,
  quote: Quote,
  trait: TraitRef,
});

const Created = Schema.Struct({
  action: Schema.Literal("new"),
  source: SourceRef,
  quote: Quote,
  ...Draft,
});

const Replacing = Schema.Struct({
  action: Schema.Literal("replace"),
  source: SourceRef,
  quote: Quote,
  trait: TraitRef,
  ...Draft,
});

const Observation = Schema.Union([Linked, Created, Replacing]);

const AnalysisResult = Schema.Struct({
  observations: Schema.Array(Observation),
});

type TraitSourceValue = typeof TraitSource.Type;

type KnownTraitValue = typeof KnownTrait.Type;

type AnalysisRequestValue = typeof AnalysisRequest.Type;

type ObservationValue = typeof Observation.Type;

type AnalysisResultValue = typeof AnalysisResult.Type;

export { AnalysisRequest, AnalysisResult, KnownTrait, Observation, TraitSource };
export type {
  AnalysisRequestValue,
  AnalysisResultValue,
  KnownTraitValue,
  ObservationValue,
  TraitSourceValue,
};
