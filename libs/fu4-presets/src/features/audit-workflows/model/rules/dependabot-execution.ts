import { Array as Arr, Option, pipe } from "effect";

import {
  updateLocation,
  updateLocationWithGrip,
  updatesOf,
} from "#/features/audit-workflows/lib/dependabot.ts";
import {
  at,
  atPath,
  confidence,
  finding,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/audit-workflows/lib/location.ts";
import type { Audit } from "#/features/audit-workflows/model/audit.ts";

const meta = {
  ident: "dependabot-execution",
  desc: "external code execution in Dependabot updates",
} as const;

export const dependabotExecution: Audit = {
  ...meta,
  dependabot: (dependabot) =>
    pipe(
      updatesOf(dependabot),
      Arr.filter((update) =>
        Option.exists(
          Arr.get(dependabot.model.updates, update.index),
          (model) => model.insecureExternalCodeExecution === "allow",
        ),
      ),
      Arr.map((update) =>
        pipe(
          finding(meta),
          confidence("high"),
          severity("high"),
          atPath(
            updateLocation(update),
            withKeys("insecure-external-code-execution"),
            primary,
            annotated("enabled here"),
          ),
          at(updateLocationWithGrip(update)),
        ),
      ),
    ),
};
