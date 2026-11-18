import { Array as Arr, Option, String as Str, pipe } from "effect";

import { displayEnv } from "#/features/zizmor/lib/common.ts";
import { asBare, extracted } from "#/features/zizmor/lib/expressions.ts";
import { isCommitRef, usesMatches } from "#/features/zizmor/lib/uses.ts";
import { isAtLeast, parseVersion } from "#/features/zizmor/lib/version.ts";
import type { RepositoryUses } from "#/features/zizmor/model/common.ts";
import type { Persona } from "#/features/zizmor/model/finding.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

const V6 = Option.getOrThrow(parseVersion("v6"));

const isCheckout = usesMatches("actions/checkout");
const isUpload = usesMatches("actions/upload-artifact");

export interface Checkout {
  readonly step: StepView;
  readonly persona: Persona;
  readonly modern: Option.Option<boolean>;
}

const isModern = (uses: RepositoryUses): Option.Option<boolean> => {
  if (isCommitRef(uses.gitRef)) {
    return Option.none();
  }
  return Option.map(parseVersion(uses.gitRef), (version) => isAtLeast(V6)(version));
};

const splitPatterns = (patterns: string): readonly string[] =>
  pipe(
    Str.split("\n")(patterns),
    Arr.map(Str.trim),
    Arr.filter((line) => Str.isNonEmpty(line) && !Str.startsWith("#")(line)),
  );

const DOTS = new Set([".", "./", "..", "../"]);

const isDangerousPath = (path: string): boolean => {
  if (DOTS.has(path)) {
    return true;
  }
  const expr = extracted(path);
  return expr.fenced && Str.includes("github.workspace")(asBare(expr));
};

const personaOf = (value: Option.Option<string>): Option.Option<Persona> => {
  if (Option.contains(value, "false")) {
    return Option.none();
  }
  if (Option.contains(value, "true")) {
    return Option.some("auditor");
  }
  if (Option.exists(value, (text) => extracted(text).fenced)) {
    return Option.some("pedantic");
  }
  return Option.some("regular");
};

export const checkoutOf = (view: StepView): readonly Checkout[] => {
  const { body } = view;
  if (
    body.type !== "uses" ||
    body.uses.type !== "repository" ||
    !isCheckout(body.uses) ||
    body.with.type !== "literal"
  ) {
    return [];
  }
  const modern = isModern(body.uses);
  const value = Option.map(
    Option.fromNullishOr(body.with.value.get("persist-credentials")),
    displayEnv,
  );
  return pipe(
    personaOf(value),
    Option.map((level): Checkout => ({ step: view, persona: level, modern })),
    Option.toArray,
  );
};

export const isVulnerableUpload = (view: StepView): boolean => {
  const { body } = view;
  if (
    body.type !== "uses" ||
    body.uses.type !== "repository" ||
    !isUpload(body.uses) ||
    body.with.type !== "literal"
  ) {
    return false;
  }
  return Option.exists(
    Option.fromNullishOr(body.with.value.get("path")),
    (path) => path.type === "string" && pipe(splitPatterns(path.value), Arr.some(isDangerousPath)),
  );
};
