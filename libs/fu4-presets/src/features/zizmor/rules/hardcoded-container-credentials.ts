import { Array as Arr, Option, pipe } from "effect";

import { extracted } from "#/features/zizmor/lib/expressions.ts";
import { at, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/zizmor/lib/location.ts";
import { jobLocation, normalJobsOf } from "#/features/zizmor/lib/workflow.ts";
import type { Audit } from "#/features/zizmor/model/audit.ts";
import type { FindingDraft, SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { Container } from "#/features/zizmor/model/workflow.ts";

const meta = {
  ident: "hardcoded-container-credentials",
  desc: "hardcoded credential in GitHub Actions container configurations",
} as const;

const hardcoded = (container: Container): boolean =>
  container.type === "container" &&
  pipe(
    container.credentials,
    Option.flatMap((credentials) => credentials.password),
    Option.exists((password) => !extracted(password).fenced),
  );

const draft = (location: SymbolicLocation): FindingDraft =>
  pipe(finding(meta), severity("high"), confidence("high"), at(location));

export const hardcodedContainerCredentials: Audit = {
  ...meta,
  workflow: (workflow) =>
    Arr.flatMap(normalJobsOf(workflow), (job) => {
      const base = primary(jobLocation(job));
      const own = pipe(
        Option.toArray(job.model.container),
        Arr.filter(hardcoded),
        Arr.map(() =>
          draft(
            annotated("container registry password is hard-coded")(
              withKeys("container", "credentials")(base),
            ),
          ),
        ),
      );
      const services = pipe(
        job.model.services,
        Arr.filter(([, container]) => hardcoded(container)),
        Arr.map(([service]) =>
          draft(
            annotated(`service ${service}: container registry password is hard-coded`)(
              withKeys("services", service, "credentials")(base),
            ),
          ),
        ),
      );
      return [...own, ...services];
    }),
};
