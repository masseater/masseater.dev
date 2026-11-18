import { Array as Arr, Schema, pipe } from "effect";

import { casesOf } from "#/entities/bench/index.ts";
import type { Tool } from "#/entities/bench/index.ts";
import { fromJson, indexKeys, keyOf, linesOf, matching } from "#/shared/lib/findings.ts";

const SCOPE = "Commits from the base to HEAD, Betterleaks default rules, no live validation";

const BetterleaksLocation = Schema.Struct({ path: Schema.String, start_line: Schema.Finite });

const BetterleaksFinding = Schema.Struct({ rule_id: Schema.String, location: BetterleaksLocation });

const Betterleaks = Schema.Struct({ findings: Schema.Array(BetterleaksFinding) });

const GitleaksFinding = Schema.Struct({
  RuleID: Schema.String,
  File: Schema.String,
  StartLine: Schema.Finite,
});

const Gitleaks = Schema.Array(GitleaksFinding);

const Kingfisher = Schema.Struct({ findings: Schema.Array(Schema.Unknown) });

const betterleaksKeys = fromJson(Schema.decodeUnknownOption(Betterleaks))((report) =>
  pipe(
    report.findings,
    Arr.map(({ location, rule_id: rule }) =>
      keyOf({ path: location.path, line: location.start_line, rule }),
    ),
  ),
);

const gitleaksKeys = fromJson(Schema.decodeUnknownOption(Gitleaks))(
  Arr.map((found) => keyOf({ path: found.File, line: found.StartLine, rule: found.RuleID })),
);

const kingfisherKeys = fromJson(Schema.decodeUnknownOption(Kingfisher))((report) =>
  indexKeys(report.findings),
);

export const h56mConfig = (presets: string): string =>
  `import { betterleaks } from "${presets}";\nexport default { h56m: { extend: { path: betterleaks } } };\n`;

const TOOLS: readonly Tool[] = [
  {
    tool: "h56m",
    version: "workspace, h56m-presets betterleaks",
    own: true,
    scope: SCOPE,
    command: (context) => `node ${context.bins["h56m"] ?? ""} ${context.base}`,
    files: (context) => ({ "vite.config.mts": h56mConfig(context.config["h56m-presets"] ?? "") }),
    findings: matching(/^(?<path>\S+?):(?<line>\d+):\d+ (?<rule>\S+) /u),
    keys: "betterleaks",
  },
  {
    tool: "Betterleaks",
    version: "2.0.0-rc.9",
    own: false,
    scope: SCOPE,
    command: (context) =>
      `betterleaks git . --config ${context.config["betterleaks.toml"] ?? ""} --no-banner --redact --revision=${context.base}..HEAD -o -`,
    findings: betterleaksKeys,
    keys: "betterleaks",
  },
  {
    tool: "gitleaks",
    version: "8.30.1",
    own: false,
    scope: "Commits from the base to HEAD, gitleaks default rules",
    command: (context) =>
      `gitleaks git . --no-banner --redact --log-opts=${context.base}..HEAD --report-format json --report-path -`,
    findings: gitleaksKeys,
  },
  {
    tool: "TruffleHog",
    version: "3.99.9",
    own: false,
    scope: "Commits from the base to HEAD, all detectors, --no-verification",
    command: (context) =>
      `trufflehog git file://. --since-commit ${context.base} --branch HEAD --no-verification --json --no-update`,
    findings: linesOf,
  },
  {
    tool: "Kingfisher",
    version: "2.19.1",
    own: false,
    scope: "Commits from the base to HEAD, default rules, --no-validate",
    command: (context) =>
      `kingfisher scan . --since-commit ${context.base} --branch HEAD --git-history full --no-validate --format json --no-update-check`,
    caches: () => ["$HOME/.cache/kingfisher"],
    findings: kingfisherKeys,
  },
];

export const secretCases = casesOf("secrets")(TOOLS);
