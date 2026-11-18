import { Array as Arr, Option, Result, pipe, String as Str } from "effect";

import type {
  Confidence,
  Finding,
  FindingDraft,
  Location,
  Persona,
  Severity,
  SymbolicLocation,
} from "#/features/audit-workflows/model/finding.ts";
import type { Document } from "#/shared/yamlpath/index.ts";

import { commentIgnores, concretize } from "./location.ts";

export interface AuditMeta {
  readonly ident: string;
  readonly desc: string;
}

export const finding = (meta: AuditMeta): FindingDraft => ({
  ident: meta.ident,
  desc: meta.desc,
  url: `https://docs.zizmor.sh/audits/#${meta.ident}`,
  severity: "low",
  confidence: "low",
  persona: "regular",
  locations: [],
  rawLocations: [],
  tip: Option.none(),
});

export const severity =
  (value: Severity) =>
  (draft: FindingDraft): FindingDraft => ({ ...draft, severity: value });

export const confidence =
  (value: Confidence) =>
  (draft: FindingDraft): FindingDraft => ({ ...draft, confidence: value });

export const persona =
  (value: Persona) =>
  (draft: FindingDraft): FindingDraft => ({ ...draft, persona: value });

export const tip =
  (value: string) =>
  (draft: FindingDraft): FindingDraft => ({ ...draft, tip: Option.some(value) });

export const at =
  (...locations: readonly SymbolicLocation[]) =>
  (draft: FindingDraft): FindingDraft => ({
    ...draft,
    locations: [...draft.locations, ...locations],
  });

export const atPath =
  (
    location: SymbolicLocation,
    ...refinements: readonly ((each: SymbolicLocation) => SymbolicLocation)[]
  ) =>
  (draft: FindingDraft): FindingDraft => {
    let current = location;
    for (const refine of refinements) {
      current = refine(current);
    }
    return at(current)(draft);
  };

export const atRaw =
  (location: Location) =>
  (draft: FindingDraft): FindingDraft => ({
    ...draft,
    rawLocations: [...draft.rawLocations, location],
  });

const SINGLE = 1;

const asPrimary = (only: Location): Location => ({
  ...only,
  symbolic: { ...only.symbolic, kind: "primary" },
});

const finished =
  (draft: FindingDraft) =>
  (locations: readonly Location[]): Finding => ({
    ...draft,
    locations,
    ignored: pipe(
      locations,
      Arr.flatMap((each) => each.concrete.comments),
      Arr.some(commentIgnores(draft.ident)),
    ),
  });

const withPrimary = (
  locations: readonly Location[],
): Result.Result<readonly Location[], string> => {
  if (locations.length === SINGLE) {
    return Result.succeed(pipe(locations, Arr.map(asPrimary)));
  }
  if (
    !pipe(
      locations,
      Arr.some((each) => each.symbolic.kind === "primary"),
    )
  ) {
    return Result.fail("API misuse: at least one location must be marked with primary()");
  }
  return Result.succeed(locations);
};

export const build =
  (document: Document) =>
  (draft: FindingDraft): Result.Result<Finding, string> =>
    pipe(
      draft.locations,
      Arr.map(concretize(document)),
      Result.all,
      Result.map((locations) => [...locations, ...draft.rawLocations]),
      Result.flatMap(withPrimary),
      Result.map(finished(draft)),
    );

export const primaryLocation = (found: Finding): Location =>
  Option.getOrThrow(Arr.findFirst(found.locations, (each) => each.symbolic.kind === "primary"));

export const message = (found: Finding): string => {
  const location = primaryLocation(found);
  const base = Option.match(
    Option.liftPredicate(location.symbolic.annotation, (text) => Str.isNonEmpty(text)),
    {
      onNone: () => found.desc,
      onSome: (annotation) => `${found.desc}: ${annotation}`,
    },
  );
  const withTip = Option.match(found.tip, {
    onNone: () => base,
    onSome: (text) => `${base}. ${text}`,
  });
  return `${withTip} (${Option.getOrElse(location.symbolic.link, () => found.url)})`;
};
