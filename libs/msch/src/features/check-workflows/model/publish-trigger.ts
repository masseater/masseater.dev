import { Array as Arr, Option, pipe } from "effect";
import { isMap, isScalar, isSeq, parseDocument } from "yaml";

import type { RuleName } from "#/shared/lib/problem.ts";
import { runScriptsOf } from "#/shared/lib/workflow-run.ts";

import { keyOffsetIn, pairIn, workflowCheck } from "./workflow-yaml.ts";

const RULE: RuleName = "publish-trigger";
const PUBLISH = /\bmsch-publish\b/u;
const MANUAL = "workflow_dispatch";
const TRIGGER_KEY = "on";
const MESSAGE =
  "publishes with `msch-publish` from a trigger other than `workflow_dispatch`. Publishing is manual: bump the version in a PR, then dispatch the workflow for the workspace.";

const triggersOf = (node: unknown): readonly string[] => {
  if (isScalar(node)) {
    return [String(node.value)];
  }
  if (isSeq(node)) {
    return pipe(
      node.items,
      Arr.filter(isScalar),
      Arr.map((item) => String(item.value)),
    );
  }
  if (isMap(node)) {
    return pipe(
      node.items,
      Arr.flatMap(({ key }) =>
        pipe(
          Option.liftPredicate(key, isScalar),
          Option.map((scalar) => String(scalar.value)),
          Option.toArray,
        ),
      ),
    );
  }
  return [];
};

const publishTriggerOffsetsOf = (source: string): readonly number[] => {
  const publishes = pipe(
    runScriptsOf(source),
    Arr.some(({ text }) => PUBLISH.test(text)),
  );
  if (!publishes) {
    return [];
  }
  const { contents } = parseDocument(source);
  const triggers = pipe(
    pairIn(TRIGGER_KEY)(contents),
    Option.map(({ value }) => triggersOf(value)),
    Option.getOrElse((): readonly string[] => []),
  );
  if (
    pipe(
      triggers,
      Arr.every((trigger) => trigger === MANUAL),
    )
  ) {
    return [];
  }
  return Option.toArray(keyOffsetIn(TRIGGER_KEY)(contents));
};

/** @internal */
export const checkPublishTrigger = workflowCheck({
  rule: RULE,
  message: MESSAGE,
  offsetsOf: publishTriggerOffsetsOf,
});
