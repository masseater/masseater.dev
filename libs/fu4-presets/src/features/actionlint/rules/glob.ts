import { Array as Arr, Option, pipe } from "effect";

import type { Event, EventFilter, WebhookEvent } from "#/entities/workflow/model/types.ts";
import { NOOP, workflowRule } from "#/features/actionlint/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/actionlint/lib/workflow-rule.ts";
import { validatePath, validateRef } from "#/shared/glob/index.ts";
import type { InvalidGlob } from "#/shared/glob/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const NOTE =
  "note: filter pattern syntax is explained at https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet";
const NEXT = 1;
const NONE = 0;

const shiftOf = (text: Text, error: InvalidGlob): number => {
  const quote = Number(text.quoted);
  if (error.column === NONE) {
    return quote;
  }
  return quote + error.column - NEXT;
};

const reportErrors =
  (fail: Fail) =>
  (errors: readonly InvalidGlob[], text: Text): void => {
    for (const error of errors) {
      fail(
        { line: text.line, column: text.column + shiftOf(text, error) },
        `${error.message}. ${NOTE}`,
      );
    }
  };

const nonEmpty = (filter: EventFilter | undefined): readonly Text[] =>
  pipe(
    Option.fromNullishOr(filter),
    Option.match({ onNone: (): readonly Text[] => [], onSome: (found) => found.values }),
    Arr.filter((value) => value.value.length > NONE),
  );

const checkRef =
  (fail: Fail) =>
  (text: Text): void => {
    if (text.value.length > NONE) {
      reportErrors(fail)(validateRef(text.value), text);
    }
  };

const checkWebhook =
  (fail: Fail) =>
  (event: WebhookEvent): void => {
    for (const filter of [event.branches, event.branchesIgnore, event.tags, event.tagsIgnore]) {
      for (const value of nonEmpty(filter)) {
        checkRef(fail)(value);
      }
    }
    for (const value of [...nonEmpty(event.paths), ...nonEmpty(event.pathsIgnore)]) {
      reportErrors(fail)(validatePath(value.value), value);
    }
  };

const checkEvent =
  (fail: Fail) =>
  (event: Event): void => {
    if (event.type === "image_version") {
      for (const version of event.versions) {
        checkRef(fail)(version);
      }
      return;
    }
    if (event.type === "webhook") {
      checkWebhook(fail)(event);
    }
  };

export const glob = workflowRule({
  description: "Reports invalid branch, tag and path filter patterns",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-glob-pattern",
  visitor: (fail): Visitor => ({
    ...NOOP,
    workflowPre: (workflow) => {
      for (const event of Option.getOrElse(Option.fromNullishOr(workflow.on), () => [])) {
        checkEvent(fail)(event);
      }
    },
    jobPre: (job) => {
      const version = pipe(
        Option.fromNullishOr(job.snapshot),
        Option.flatMap((snapshot) => Option.fromNullishOr(snapshot.version)),
      );
      for (const found of Option.toArray(version)) {
        checkRef(fail)(found);
      }
    },
  }),
});
