import { Array as Arr, Option, pipe } from "effect";

import { dockerLocation } from "#/features/audit-workflows/lib/action.ts";
import {
  at,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  primary,
  withinText,
  withKeys,
} from "#/features/audit-workflows/lib/location.ts";
import { stepLocation, stepsOf } from "#/features/audit-workflows/lib/workflow-steps.ts";
import { jobLocation, matrixOf } from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { MatrixView } from "#/features/audit-workflows/model/step.ts";

import { candidatesOf } from "./unpinned-images-candidates.ts";
import type { ImageAt } from "./unpinned-images-candidates.ts";

const meta = { ident: "unpinned-images", desc: "unpinned image references" } as const;

const classify = (images: readonly ImageAt[], matrix: Option.Option<MatrixView>): Drafts =>
  pipe(
    images,
    Arr.flatMap((entry) =>
      Arr.map(candidatesOf(matrix)(entry), (candidate) =>
        pipe(
          finding(meta),
          severity("high"),
          confidence(candidate.confidence),
          persona(candidate.persona),
          at(annotated(candidate.annotation)(candidate.location)),
          at(...candidate.related),
        ),
      ),
    ),
  );

export const unpinnedImages: Audit = {
  ...meta,
  dockerAction: (action) => {
    const { runs } = action.model;
    if (runs.type !== "docker" || runs.image.type !== "image") {
      return [];
    }
    return classify([[runs.image.image, withKeys("image")(dockerLocation(action))]], Option.none());
  },
  normalJob: (job) => {
    const base = primary(jobLocation(job));
    const container = Arr.map(Option.toArray(job.model.container), (each) => {
      if (each.type === "name") {
        return [each.image, withKeys("container")(base)] as const;
      }
      return [each.image, withKeys("container", "image")(base)] as const;
    });
    const services = pipe(
      job.model.services,
      Arr.flatMap(([service, each]) => {
        if (each.type === "container") {
          return [[each.image, withKeys("services", service, "image")(base)] as const];
        }
        return [];
      }),
    );
    const steps = Arr.flatMap(stepsOf(job), (step) => {
      const { body } = step.model;
      if (body.type !== "uses" || body.uses.type !== "docker") {
        return [];
      }
      const { uses } = body;
      return [
        [
          { type: "literal", value: uses } as const,
          pipe(stepLocation(step), primary, withKeys("uses"), withinText(uses.raw)),
        ] as const,
      ];
    });
    return classify([...container, ...services, ...steps], matrixOf(job));
  },
};
