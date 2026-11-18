import { Array as Arr, Option, String as Str, pipe } from "effect";

import { childOf, contexts, singleTail } from "#/entities/expression-tree/index.ts";
import { asBare, fencedInRoute, parseBare } from "#/features/audit-workflows/lib/expressions.ts";
import {
  at,
  atRaw,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  hidden,
  keyOnly,
  primary,
  subfeatureLocation,
} from "#/features/audit-workflows/lib/location.ts";
import { jobLocation } from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit } from "#/features/audit-workflows/model/audit.ts";
import { subfeatureOf } from "#/shared/subfeature/index.ts";

const meta = {
  ident: "secrets-outside-env",
  desc: "secrets referenced without a dedicated environment",
} as const;

const OUTSIDE = "secret is accessed outside of a dedicated environment";

const isSecret = childOf("secrets");

export const secretsOutsideEnv: Audit = {
  ...meta,
  normalJob: (job, context) => {
    if (Option.isSome(job.workflow.model.on.workflowCall) || Option.isSome(job.model.environment)) {
      return [];
    }
    const { document } = job.workflow;
    const location = jobLocation(job);
    return pipe(
      fencedInRoute(document)(location.route),
      Arr.flatMap((fenced) =>
        pipe(
          parseBare(asBare(fenced.expr)),
          Option.toArray,
          Arr.flatMap(contexts),
          Arr.filter(({ context: each }) => isSecret(each)),
          Arr.filter(
            ({ context: each }) =>
              !Option.exists(singleTail(each), (name) =>
                context.config.secretsAllow.has(Str.toLowerCase(name)),
              ),
          ),
          Arr.map(({ spanned }) => {
            const symbolic = pipe(location, primary, annotated(OUTSIDE));
            const within = subfeatureOf(fenced.start + spanned.origin.start)(spanned.origin.raw);
            return pipe(
              finding(meta),
              persona("auditor"),
              severity("medium"),
              confidence("high"),
              at(hidden(location)),
              at(keyOnly(location)),
              atRaw(subfeatureLocation(document)(symbolic, within)),
            );
          }),
        ),
      ),
    );
  },
};
