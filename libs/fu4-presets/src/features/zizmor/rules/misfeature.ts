import { Array as Arr, Option, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
  tip,
} from "#/features/zizmor/lib/finding.ts";
import {
  annotated,
  keyOnly,
  primary,
  withinText,
  withKeys,
} from "#/features/zizmor/lib/location.ts";
import { normalizeShell } from "#/features/zizmor/lib/shell.ts";
import { usesMatches } from "#/features/zizmor/lib/uses.ts";
import type { Audit, Drafts } from "#/features/zizmor/model/audit.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

const meta = { ident: "misfeature", desc: "usage of GitHub Actions misfeatures" } as const;

const WELL_KNOWN = new Set(["bash", "pwsh", "python", "sh", "powershell"]);
const CMD = new Set(["cmd", "cmd.exe"]);

const isSetupPython = usesMatches("actions/setup-python");

const uses = (view: StepView): Drafts => {
  const { body } = view;
  if (
    body.type !== "uses" ||
    body.uses.type !== "repository" ||
    body.with.type !== "literal" ||
    !isSetupPython(body.uses) ||
    !body.with.value.has("pip-install")
  ) {
    return [];
  }
  return [
    pipe(
      finding(meta),
      atPath(view.location, withKeys("uses"), withinText(body.uses.raw), annotated("this action")),
      atPath(
        view.location,
        primary,
        withKeys("with", "pip-install"),
        annotated("installs packages in a brittle manner"),
      ),
      tip("always use a virtual environment to manage Python packages"),
      severity("low"),
      confidence("high"),
    ),
  ];
};

const run = (view: StepView): Drafts =>
  pipe(
    view.shell(),
    Option.toArray,
    Arr.flatMap(([raw, location]) => {
      const shell = normalizeShell(raw);
      if (WELL_KNOWN.has(shell)) {
        return [];
      }
      if (CMD.has(shell)) {
        return [
          pipe(
            finding(meta),
            confidence("high"),
            severity("low"),
            at(annotated("Windows CMD shell limits analysis")(view.locationWithGrip)),
            at(primary(location)),
            tip("use 'shell: pwsh' or 'shell: bash' for improved analysis"),
          ),
        ];
      }
      return [
        pipe(
          finding(meta),
          confidence("high"),
          severity("low"),
          persona("auditor"),
          atPath(view.location, withKeys("run"), keyOnly, annotated("uses a non-well-known shell")),
          at(primary(location)),
          tip("use a shell that's well-known to GitHub Actions, like 'bash' or 'pwsh'"),
        ),
      ];
    }),
  );

const step = (view: StepView): Drafts => {
  if (view.body.type === "run") {
    return run(view);
  }
  return uses(view);
};

export const misfeature: Audit = { ...meta, step, compositeStep: step };
