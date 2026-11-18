import { Array as Arr, Result, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/zizmor/lib/finding.ts";
import {
  annotated,
  hidden,
  primary,
  withinText,
  withKeys,
} from "#/features/zizmor/lib/location.ts";
import { parsePattern, patternMatches, usesRef } from "#/features/zizmor/lib/uses.ts";
import type { Audit, Drafts } from "#/features/zizmor/model/audit.ts";
import type { Confidence, Persona } from "#/features/zizmor/model/finding.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

const meta = {
  ident: "superfluous-actions",
  desc: "action functionality is already included by the runner",
} as const;

const GIT_COMMIT = "use `git add`, `git commit`, and `git push` in a script step";
const GH_RELEASE = "use `gh release` in a script step";

const SUPERFLUOUS: readonly (readonly [string, string, Persona, Confidence])[] = [
  ["ncipollo/release-action", GH_RELEASE, "regular", "high"],
  ["softprops/action-gh-release", GH_RELEASE, "regular", "high"],
  ["elgohr/Github-Release-Action", GH_RELEASE, "regular", "high"],
  ["peter-evans/create-pull-request", "use `gh pr create` in a script step", "pedantic", "low"],
  [
    "peter-evans/create-or-update-comment",
    "use `gh pr comment` or `gh issue comment` in a script step",
    "pedantic",
    "low",
  ],
  ["dacbd/create-issue-action", "use `gh issue create` in a script step", "regular", "high"],
  [
    "actions-ecosystem/action-add-labels",
    "use `gh issue edit --add-label` or `gh pr edit --add-label` in a script step",
    "regular",
    "high",
  ],
  [
    "actions-ecosystem/action-remove-labels",
    "use `gh issue edit --remove-label` or `gh pr edit --remove-label` in a script step",
    "regular",
    "high",
  ],
  [
    "svenstaro/upload-release-action",
    "use `gh release create` and `gh release upload` in a script step",
    "regular",
    "high",
  ],
  [
    "addnab/docker-run-action",
    "use `docker run` in a script step, or use a container step",
    "regular",
    "high",
  ],
  ["sergeysova/jq-action", "use `jq` in a script step", "regular", "high"],
  ["dtolnay/rust-toolchain", "use `rustup` and/or `cargo` in a script step", "pedantic", "medium"],
  ["stefanzweifel/git-auto-commit-action", GIT_COMMIT, "pedantic", "low"],
  ["EndBug/add-and-commit", GIT_COMMIT, "pedantic", "low"],
];

const PATTERNS = pipe(
  SUPERFLUOUS,
  Arr.map(([pattern, ...rest]) => [Result.getOrThrow(parsePattern(pattern)), ...rest] as const),
);

const step = (view: StepView): Drafts => {
  const { body } = view;
  if (body.type !== "uses" || body.uses.type !== "repository") {
    return [];
  }
  const { uses } = body;
  return pipe(
    PATTERNS,
    Arr.filter(([pattern]) => patternMatches(pattern)(usesRef(uses))),
    Arr.map(([, recommendation, level, certainty]) =>
      pipe(
        finding(meta),
        confidence(certainty),
        severity("informational"),
        persona(level),
        at(view.locationWithGrip),
        atPath(
          view.location,
          withKeys("uses"),
          withinText(uses.raw),
          annotated(recommendation),
          primary,
        ),
        at(hidden(view.location)),
      ),
    ),
  );
};

export const superfluousActions: Audit = { ...meta, step, compositeStep: step };
