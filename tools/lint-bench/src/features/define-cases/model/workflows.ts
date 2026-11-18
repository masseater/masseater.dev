import { Array as Arr, Schema, String as Str, pipe } from "effect";

import { casesOf } from "#/entities/bench/index.ts";
import type { Tool } from "#/entities/bench/index.ts";
import { containing, fromJson, indexKeys, keyOf, matching } from "#/shared/lib/findings.ts";

const OFFLINE = "env -u GH_TOKEN -u GITHUB_TOKEN";

const SPLIT = "\u0000";

const ALL_FILES =
  "Workflows, action.yml files and the Dependabot config, offline, recommended or default rules";

const ActionlintFinding = Schema.Struct({
  filepath: Schema.String,
  line: Schema.Finite,
  kind: Schema.String,
});

const Actionlint = Schema.Array(ActionlintFinding);

const ZizmorKey = Schema.Struct({ Local: Schema.Struct({ verbatim_path: Schema.String }) });

const ZizmorPoint = Schema.Struct({ start_point: Schema.Struct({ row: Schema.Finite }) });

const ZizmorLocation = Schema.Struct({
  symbolic: Schema.Struct({ kind: Schema.String, key: ZizmorKey }),
  concrete: Schema.Struct({ location: ZizmorPoint }),
});

const ZizmorFinding = Schema.Struct({
  ident: Schema.String,
  locations: Schema.Array(ZizmorLocation),
});

const Zizmor = Schema.Array(ZizmorFinding);

const Poutine = Schema.Struct({ findings: Schema.Array(Schema.Unknown) });

const Sisakulint = Schema.Array(Schema.Unknown);

const PRIMARY = "Primary";

const LINE_OF_ROW = 1;

const actionlintKeys = fromJson(Schema.decodeUnknownOption(Actionlint))(
  Arr.map((found) =>
    keyOf({ path: found.filepath, line: found.line, rule: `actionlint/${found.kind}` }),
  ),
);

const zizmorKey =
  (found: typeof ZizmorFinding.Type) =>
  (location: typeof ZizmorLocation.Type): string =>
    keyOf({
      path: location.symbolic.key.Local.verbatim_path,
      line: location.concrete.location.start_point.row + LINE_OF_ROW,
      rule: `zizmor/${found.ident}`,
    });

const primaryKey = (found: typeof ZizmorFinding.Type): readonly string[] =>
  pipe(
    found.locations,
    Arr.filter((location) => location.symbolic.kind === PRIMARY),
    Arr.take(LINE_OF_ROW),
    Arr.map(zizmorKey(found)),
  );

const zizmorKeys = fromJson(Schema.decodeUnknownOption(Zizmor))(Arr.flatMap(primaryKey));

const bothKeys = (text: string): readonly string[] =>
  pipe(Str.split(text, SPLIT), ([first, second]) => [
    ...actionlintKeys(first),
    ...zizmorKeys(second ?? ""),
  ]);

const poutineKeys = fromJson(Schema.decodeUnknownOption(Poutine))((report) =>
  indexKeys(report.findings),
);

const sisakulintKeys = fromJson(Schema.decodeUnknownOption(Sisakulint))(indexKeys);

const ACTIONLINT = "actionlint -format '{{json .}}'";

const FU4_FILES =
  "git ls-files -z -- '.github/workflows/*.yml' '.github/workflows/*.yaml' ':(glob)**/action.yml' ':(glob)**/action.yaml' '.github/dependabot.yml' '.github/dependabot.yaml' ':(exclude,attr:linguist-vendored)' ':(exclude,attr:linguist-generated)'";

const ZIZMOR = `${FU4_FILES} | xargs -0 ${OFFLINE} zizmor --offline --format json`;

export const fu4Config = (presets: string): string =>
  `import { recommended } from "${presets}";\nexport default { fu4: recommended() };\n`;

const TOOLS: readonly Tool[] = [
  {
    tool: "fu4",
    version: "workspace, fu4-presets recommended()",
    own: true,
    scope: ALL_FILES,
    command: (context) => `${OFFLINE} node ${context.bins["fu4"] ?? ""}`,
    files: (context) => ({ "vite.config.mts": fu4Config(context.config["fu4-presets"] ?? "") }),
    findings: matching(/^(?<path>\S+?):(?<line>\d+):\d+: .* \[(?<rule>\S+)\]$/u),
    keys: "actions",
  },
  {
    tool: "actionlint + zizmor",
    version: "1.7.12 + 1.32.0",
    own: false,
    scope: ALL_FILES,
    command: () => `${ACTIONLINT}; printf '\\0'; ${ZIZMOR}`,
    findings: bothKeys,
    keys: "actions",
  },
  {
    tool: "actionlint",
    version: "1.7.12",
    own: false,
    scope: "Workflows only, with shellcheck",
    command: () => ACTIONLINT,
    findings: actionlintKeys,
  },
  {
    tool: "zizmor",
    version: "1.32.0",
    own: false,
    scope: "Workflows, action.yml files and the Dependabot config, offline, regular persona",
    command: () => ZIZMOR,
    findings: zizmorKeys,
  },
  {
    tool: "poutine",
    version: "1.1.6",
    own: false,
    scope: "Workflows and actions, default rules",
    command: () => "poutine analyze_local . --format json --quiet",
    findings: poutineKeys,
  },
  {
    tool: "ghalint",
    version: "1.6.0",
    own: false,
    scope: "Workflows and actions, default policies",
    command: () => "ghalint run 2>&1; ghalint run-action 2>&1",
    findings: containing("violates"),
  },
  {
    tool: "sisakulint",
    version: "0.3.8",
    own: false,
    scope: "Workflows, default rules",
    command: () => `${OFFLINE} sisakulint -format '{{json .}}'`,
    findings: sisakulintKeys,
  },
];

export const workflowCases = casesOf("workflows")(TOOLS);
