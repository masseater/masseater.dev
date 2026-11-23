import { Array as Arr, Option, String as Str, pipe } from "effect";

import { computedIndices, consteval, constevalSubexprs } from "#/entities/expression-tree/index.ts";
import type { Evaluation, Origin, Spanned } from "#/entities/expression-tree/index.ts";
import {
  at,
  atPath,
  atRaw,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  primary,
  rootLocation,
  subfeatureLocation,
  withKeys,
} from "#/features/audit-workflows/lib/location.ts";
import { parsedFenced, supportsTemplates } from "#/features/audit-workflows/lib/raw.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { FindingDraft, Persona } from "#/features/audit-workflows/model/finding.ts";
import type { AuditInput } from "#/features/audit-workflows/model/input.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";
import { subfeatureOf } from "#/shared/subfeature/index.ts";

const meta = { ident: "obfuscation", desc: "obfuscated usage of GitHub Actions features" } as const;

type Annotation = readonly [string, Origin, Persona];

const TEMPLATE_OPEN = "${{";

const replaceable = (evaluation: Evaluation): boolean =>
  evaluation.type !== "array" &&
  evaluation.type !== "object" &&
  !(evaluation.type === "string" && pipe(evaluation.value, Str.includes(TEMPLATE_OPEN)));

const componentAnnotation = (component: string): readonly string[] => {
  if (component === ".") {
    return ["actions reference contains '.'"];
  }
  if (component === "..") {
    return ["actions reference contains '..'"];
  }
  if (Str.isEmpty(component)) {
    return ["actions reference contains empty component"];
  }
  return [];
};

const repoAnnotations = (subpath: Option.Option<string>): readonly string[] =>
  pipe(Option.toArray(subpath), Arr.flatMap(Str.split("/")), Arr.flatMap(componentAnnotation));

const reducible = (spanned: Spanned): readonly Annotation[] =>
  pipe(
    constevalSubexprs(spanned),
    Arr.filter(([, evaluation]) => replaceable(evaluation)),
    Arr.map(([subexpr]): Annotation => ["can be reduced to a constant", subexpr.origin, "regular"]),
  );

const wholeAnnotations = (spanned: Spanned): readonly Annotation[] => {
  if (Option.exists(consteval(spanned.expr), replaceable)) {
    return [["can be replaced by its static evaluation", spanned.origin, "regular"]];
  }
  return reducible(spanned);
};

const exprAnnotations = (spanned: Spanned): readonly Annotation[] => [
  ...wholeAnnotations(spanned),
  ...Arr.map(computedIndices(spanned), (index): Annotation => [
    "index expression is computed",
    index.origin,
    "pedantic",
  ]),
];

const repoFindings = (view: StepView, annotations: readonly string[]): Drafts => {
  if (Arr.isReadonlyArrayEmpty(annotations)) {
    return [];
  }
  const uses = withKeys("uses")(primary(view.location));
  const locations = pipe(
    annotations,
    Arr.map((annotation) => annotated(annotation)(uses)),
  );
  return [pipe(finding(meta), confidence("high"), severity("low"), at(...locations))];
};

const opaqueWith = (view: StepView): FindingDraft =>
  pipe(
    finding(meta),
    confidence("high"),
    severity("informational"),
    persona("regular"),
    atPath(view.location, withKeys("uses"), annotated("this action")),
    atPath(
      view.location,
      primary,
      withKeys("with"),
      annotated("use of an expression for `with:` prevents analysis"),
    ),
  );

const step = (view: StepView): Drafts => {
  const { body } = view;
  if (body.type !== "uses" || body.uses.type !== "repository") {
    return [];
  }
  const repo = repoFindings(view, repoAnnotations(body.uses.subpath));
  if (body.with.type !== "expr") {
    return repo;
  }
  return [...repo, opaqueWith(view)];
};

const annotate =
  (input: AuditInput, start: number) =>
  (draft: FindingDraft, [annotation, origin, level]: Annotation): FindingDraft => {
    const symbolic = pipe(rootLocation(annotation), annotated(annotation), primary);
    const location = subfeatureLocation(input.document)(
      symbolic,
      subfeatureOf(start + origin.start)(origin.raw),
    );
    return pipe(draft, persona(level), atRaw(location));
  };

export const obfuscation: Audit = {
  ...meta,
  step,
  compositeStep: step,
  raw: (input) => {
    if (!supportsTemplates(input)) {
      return [];
    }
    return Arr.flatMap(parsedFenced(input), (span) => {
      const annotations = exprAnnotations(span.parsed);
      if (Arr.isReadonlyArrayEmpty(annotations)) {
        return [];
      }
      const base = pipe(finding(meta), confidence("high"), severity("low"));
      return [Arr.reduce(annotations, base, annotate(input, span.start))];
    });
  },
};
