import type { RuleContext } from "@r_masseater/fu4";
import { Option, Record as Rec, Schema, pipe } from "effect";

const Names = Schema.NullOr(Schema.Array(Schema.String));
const Runner = Schema.Struct({ labels: Schema.optional(Names) });
const ActionlintSettings = Schema.Struct({
  "self-hosted-runner": Schema.optional(Schema.NullOr(Runner)),
  "config-variables": Schema.optional(Names),
});

export interface Settings {
  readonly runnerLabels: readonly string[];
  readonly configVariables: Option.Option<readonly string[]>;
}

const decode = Schema.decodeUnknownOption(ActionlintSettings);

const parsed = new WeakMap<object, Settings>();

const parse = (raw: RuleContext["settings"]): Settings => {
  const found = pipe(Rec.get(raw, "actionlint"), Option.flatMap(decode));
  return {
    runnerLabels: pipe(
      found,
      Option.flatMap((settings) => Option.fromNullishOr(settings["self-hosted-runner"])),
      Option.flatMap((runner) => Option.fromNullishOr(runner.labels)),
      Option.getOrElse((): readonly string[] => []),
    ),
    configVariables: pipe(
      found,
      Option.flatMap((settings) => Option.fromNullishOr(settings["config-variables"])),
    ),
  };
};

export const settingsOf = (context: RuleContext): Settings =>
  parsed.getOrInsertComputed(context.settings, () => parse(context.settings));
