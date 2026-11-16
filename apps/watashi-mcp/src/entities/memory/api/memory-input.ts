import { Schema } from "effect";

import { Ref } from "#/entities/life-record/@x/memory.ts";

const MIN_ONE = 1;

export const DEFAULT_MEMORY_LIMIT = 20;

const MAX_MEMORY_LIMIT = 100;

const Project = Schema.NonEmptyString.annotate({
  description: "A repository, a claude.ai project, or assistant",
});

const Name = Schema.NonEmptyString.annotate({
  description:
    "Short kebab-case, unique in the project. An existing name replaces only the fields you pass",
});

const Limit = Schema.Int.check(
  Schema.isBetween({ minimum: MIN_ONE, maximum: MAX_MEMORY_LIMIT }),
).annotate({ description: `Default ${DEFAULT_MEMORY_LIMIT}` });

const RestoreTo = Schema.Int.check(Schema.isGreaterThanOrEqualTo(MIN_ONE)).annotate({
  description: "Revision from memory_read with revisions: true",
});

export const MemoryWriteInput = Schema.Struct({
  project: Project,
  name: Name,
  description: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description: "One-line summary. Required to create",
    }),
  ),
  content: Schema.optionalKey(
    Schema.NonEmptyString.annotate({ description: "Markdown. Required to create" }),
  ),
  evidence: Schema.optionalKey(
    Schema.Array(Ref).annotate({ description: "Life records this memo is based on" }),
  ),
  retract: Schema.optionalKey(Schema.Literal(true)),
  reason: Schema.optionalKey(Schema.NonEmptyString),
  restoreTo: Schema.optionalKey(RestoreTo),
});

export const MemoryReadInput = Schema.Struct({
  query: Schema.optionalKey(
    Schema.String.annotate({
      description:
        "Words from the project or topic. Omit to list the newest. Memos are AI-written, never the owner's words",
    }),
  ),
  project: Schema.optionalKey(Project),
  name: Schema.optionalKey(Name),
  revisions: Schema.optionalKey(Schema.Boolean),
  limit: Schema.optionalKey(Limit),
});

export const WatashiSearchInput = Schema.Struct({
  query: Schema.NonEmptyString.annotate({
    description: "Items with store memory are AI-written, never the owner's words",
  }),
  limit: Schema.optionalKey(Limit),
});

const TraitRef = Schema.String.check(Schema.isPattern(/^owner_trait:\d+$/u)).annotate({
  description: "owner_trait:<n> for a bracketed n in USER.md. Returns its evidence and revisions",
});

export const WatashiProfileInput = Schema.Struct({
  scope: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description: "A repository or app. Adds its In <scope> section",
    }),
  ),
  topic: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description: "The work at hand. Returns related traits instead of USER.md",
    }),
  ),
  trait: Schema.optionalKey(TraitRef),
});

export type MemoryWriteValue = typeof MemoryWriteInput.Type;

export type MemoryReadValue = typeof MemoryReadInput.Type;

export type WatashiSearchValue = typeof WatashiSearchInput.Type;

export type WatashiProfileValue = typeof WatashiProfileInput.Type;
