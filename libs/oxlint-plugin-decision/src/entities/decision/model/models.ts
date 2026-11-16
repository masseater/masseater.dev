import { Schema } from "effect";

type ClefModel = "clef" | "clef-flash" | "clef-omni";

type JevModel = "jev-latest" | `jev-${number}.${number}`;

export type DecisionModel = `typesafe/${JevModel}` | `cloudflare/@cf/cloudflare/${ClefModel}`;

export const JEV_MODEL = /^jev-(?:latest|\d+\.\d+)$/u;

export const CLEF_MODEL = /^@cf\/cloudflare\/clef(?:-flash|-omni)?$/u;

const DECISION_MODEL =
  /^(?:typesafe\/jev-(?:latest|\d+\.\d+)|cloudflare\/@cf\/cloudflare\/clef(?:-flash|-omni)?)$/u;

const isDecisionModel = (model: string): model is DecisionModel => DECISION_MODEL.test(model);

export const DecisionModelSchema = Schema.String.pipe(
  Schema.refine(isDecisionModel, {
    message:
      'model must be a decision model: "typesafe/jev-latest", "typesafe/jev-<major>.<minor>", or "cloudflare/@cf/cloudflare/clef", "clef-flash" or "clef-omni"',
  }),
);
