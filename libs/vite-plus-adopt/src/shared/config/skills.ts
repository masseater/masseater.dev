import { Schema } from "effect";

const Repository = Schema.String.check(Schema.isPattern(/^[\w.-]+\/[\w.-]+$/u));
const Commit = Schema.String.check(Schema.isPattern(/^[0-9a-f]{40}$/u));
const SkillName = Schema.String.check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u));

export const SkillSourceSchema = Schema.Struct({
  commit: Commit,
  root: Schema.optional(Schema.String),
  skills: Schema.Union([Schema.Literal("all"), Schema.NonEmptyArray(SkillName)]),
});

export type SkillSource = typeof SkillSourceSchema.Type;

export const SkillsSectionSchema = Schema.Record(Repository, SkillSourceSchema);

export type SkillsSection = typeof SkillsSectionSchema.Encoded;
