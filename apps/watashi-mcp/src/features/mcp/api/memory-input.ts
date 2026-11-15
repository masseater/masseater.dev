import { Schema } from "effect";

import { Ref } from "#/features/mcp/model/life-body";

const MIN_ONE = 1;

export const DEFAULT_MEMORY_LIMIT = 20;

const MAX_MEMORY_LIMIT = 100;

const Project = Schema.NonEmptyString.annotate({
  description: "The memo's project: a repository name, a claude.ai project name, or assistant",
});

const Name = Schema.NonEmptyString.annotate({
  description: "A short kebab-case name unique in the project",
});

const Limit = Schema.Int.check(
  Schema.isBetween({ minimum: MIN_ONE, maximum: MAX_MEMORY_LIMIT }),
).annotate({ description: `Default ${DEFAULT_MEMORY_LIMIT}` });

const RestoreTo = Schema.Int.check(Schema.isGreaterThanOrEqualTo(MIN_ONE)).annotate({
  description: "Restore the memo to this revision (see memory_read with revisions: true)",
});

export const MemoryWriteInput = Schema.Struct({
  project: Project,
  name: Name,
  description: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description: "One-line summary. Required when creating.",
    }),
  ),
  content: Schema.optionalKey(
    Schema.NonEmptyString.annotate({ description: "Body in Markdown. Required when creating." }),
  ),
  evidence: Schema.optionalKey(
    Schema.Array(Ref).annotate({ description: "Refs of the life records this memo is based on" }),
  ),
  retract: Schema.optionalKey(Schema.Literal(true)),
  reason: Schema.optionalKey(Schema.NonEmptyString),
  restoreTo: Schema.optionalKey(RestoreTo),
});

export const MemoryReadInput = Schema.Struct({
  query: Schema.optionalKey(
    Schema.String.annotate({
      description: "Words to look for. Empty or omitted lists the newest.",
    }),
  ),
  project: Schema.optionalKey(Project),
  name: Schema.optionalKey(Name),
  revisions: Schema.optionalKey(Schema.Boolean),
  limit: Schema.optionalKey(Limit),
});

export const WatashiSearchInput = Schema.Struct({
  query: Schema.NonEmptyString.annotate({ description: "Natural words to look for" }),
  limit: Schema.optionalKey(Limit),
});

const TraitRef = Schema.String.check(Schema.isPattern(/^owner_trait:\d+$/u)).annotate({
  description:
    "A trait ref (owner_trait:12). Returns that trait with its quoted evidence and revisions",
});

export const WatashiProfileInput = Schema.Struct({
  scope: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description:
        "A repository or project name. Returns global traits plus the traits of this scope. Omit to return every scope",
    }),
  ),
  topic: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description:
        "Natural words about the work at hand. Narrows traits to those near the words and their neighbours in the evidence graph",
    }),
  ),
  trait: Schema.optionalKey(TraitRef),
});

export type MemoryWriteValue = typeof MemoryWriteInput.Type;

export type MemoryReadValue = typeof MemoryReadInput.Type;

export type WatashiSearchValue = typeof WatashiSearchInput.Type;

export type WatashiProfileValue = typeof WatashiProfileInput.Type;
