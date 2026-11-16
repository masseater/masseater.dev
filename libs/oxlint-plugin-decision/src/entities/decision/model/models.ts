import { Schema } from "effect";

export type DecisionModel =
  | "typesafe/jev-latest"
  | `typesafe/jev-${number}.${number}`
  | "cloudflare/@cf/cloudflare/clef"
  | "cloudflare/@cf/cloudflare/clef-flash"
  | "cloudflare/@cf/cloudflare/clef-omni";

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
