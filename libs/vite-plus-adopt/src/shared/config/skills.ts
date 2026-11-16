import { Schema } from "effect";

const Repository = Schema.String.check(Schema.isPattern(/^[\w-][\w.-]*\/[\w.-]+$/u));
const LocalDirectory = Schema.String.check(Schema.isPattern(/^\.\/[\w.-]+(?:\/[\w.-]+)*$/u));
const Commit = Schema.String.check(Schema.isPattern(/^[0-9a-f]{40}$/u));
const SkillName = Schema.String.check(Schema.isPattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u));
const Selection = Schema.Union([Schema.Literal("all"), Schema.NonEmptyArray(SkillName)]);

export const RemoteSkillSourceSchema = Schema.Struct({
  commit: Commit,
  root: Schema.optional(Schema.String),
  skills: Selection,
});

export const LocalSkillSourceSchema = Schema.Struct({ skills: Selection });

export type RemoteSkillSource = typeof RemoteSkillSourceSchema.Type;

export type SkillSelection = typeof Selection.Type;

export const SkillsSectionSchema = Schema.Record(
  Schema.Union([Repository, LocalDirectory]),
  Schema.Union([RemoteSkillSourceSchema, LocalSkillSourceSchema]),
);

export type SkillsSection = typeof SkillsSectionSchema.Encoded;
