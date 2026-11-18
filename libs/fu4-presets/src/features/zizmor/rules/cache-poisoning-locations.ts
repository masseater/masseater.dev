import { Array as Arr, Option, pipe } from "effect";

import { at, confidence, finding, severity } from "#/features/zizmor/lib/finding.ts";
import { annotated, hidden, primary, withKeys } from "#/features/zizmor/lib/location.ts";
import { workflowLocation } from "#/features/zizmor/lib/workflow.ts";
import type { Drafts } from "#/features/zizmor/model/audit.ts";
import type { ControlOrigin, Usage } from "#/features/zizmor/model/coordinate.ts";
import type { SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { WorkflowInput } from "#/features/zizmor/model/input.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

import { cacheUsage } from "./cache-poisoning-control.ts";
import type { Scenario } from "./cache-poisoning-control.ts";

export const meta = {
  ident: "cache-poisoning",
  desc: "runtime artifacts potentially vulnerable to a cache poisoning attack",
} as const;

const originLocation =
  (step: StepView, annotation: string) =>
  (origin: ControlOrigin): readonly SymbolicLocation[] => {
    if (origin.type === "input") {
      return [annotated(annotation)(withKeys("with", origin.field)(step.location))];
    }
    if (origin.type === "with-expression") {
      return [annotated(annotation)(withKeys("with")(step.location))];
    }
    return [];
  };

const originLocations = (
  step: StepView,
  origins: readonly ControlOrigin[],
  annotation: string,
): readonly SymbolicLocation[] => pipe(origins, Arr.flatMap(originLocation(step, annotation)));

const usesRefOrigin = (origins: readonly ControlOrigin[]): boolean =>
  pipe(
    origins,
    Arr.some((origin) => origin.type === "uses-ref"),
  );

const versionNote =
  (origins: readonly ControlOrigin[]) =>
  (uses: SymbolicLocation): SymbolicLocation => {
    if (usesRefOrigin(origins)) {
      return annotated("action version may enable caching")(uses);
    }
    return uses;
  };

const qualifierOf = (origins: readonly ControlOrigin[]): string => {
  if (usesRefOrigin(origins)) {
    return " for this action version";
  }
  return "";
};

const defaultField = (origin: ControlOrigin): readonly string[] => {
  if (origin.type === "default") {
    return [`\`${origin.field}\``];
  }
  return [];
};

const isExplicit = (origin: ControlOrigin): boolean =>
  origin.type === "input" || origin.type === "with-expression";

const enabledNote = (origins: readonly ControlOrigin[]): Option.Option<string> => {
  const defaults = pipe(origins, Arr.flatMap(defaultField));
  if (Arr.isReadonlyArrayEmpty(defaults)) {
    return Option.liftPredicate(
      "enables caching by default",
      () => !pipe(origins, Arr.some(isExplicit)),
    );
  }
  const fields = pipe(defaults, Arr.join(" and "));
  return Option.some(`omitting ${fields} enables caching${qualifierOf(origins)}`);
};

export const locationsOf =
  (step: StepView) =>
  (usage: Usage): readonly SymbolicLocation[] => {
    const uses = withKeys("uses")(primary(step.location));
    if (usage.type === "always") {
      return [annotated("always restores from cache")(uses)];
    }
    const { origins } = usage;
    if (usage.type === "conditional") {
      return [
        versionNote(origins)(uses),
        ...originLocations(step, origins, "may enable caching here"),
      ];
    }
    const head = Option.match(enabledNote(origins), {
      onNone: () => uses,
      onSome: (text) => annotated(text)(uses),
    });
    return [head, ...originLocations(step, origins, "enables caching explicitly here")];
  };

export const scenarioLocation =
  (workflow: WorkflowInput) =>
  (scenario: Scenario): SymbolicLocation => {
    if (scenario.type === "triggers") {
      return pipe(
        workflowLocation(workflow),
        withKeys("on"),
        annotated("generally used when publishing artifacts generated at runtime"),
      );
    }
    return pipe(
      scenario.publisher.location,
      withKeys("uses"),
      annotated("runtime artifacts usually published here"),
    );
  };

export const cacheAware =
  (workflow: WorkflowInput) =>
  (scenario: Scenario) =>
  (step: StepView): Drafts => {
    const origin = scenarioLocation(workflow)(scenario);
    return pipe(
      cacheUsage(step)(scenario),
      Option.map((usage) =>
        pipe(
          finding(meta),
          confidence("low"),
          severity("high"),
          at(origin),
          at(...locationsOf(step)(usage)),
          at(hidden(step.location)),
        ),
      ),
      Option.toArray,
    );
  };
