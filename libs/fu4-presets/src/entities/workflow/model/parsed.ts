import type { Position, Source } from "@r_masseater/fu4";
import { Option } from "effect";

import { parseWorkflow } from "#/entities/workflow/lib/parse.ts";
import { optional } from "#/shared/record/index.ts";

import type { Workflow } from "./job-types.ts";

export interface Problem extends Position {
  readonly message: string;
}

export interface ParsedWorkflow {
  readonly workflow?: Workflow;
  readonly errors: readonly Problem[];
}

const parsed = new WeakMap<Source, ParsedWorkflow>();

const parse = (source: Source): ParsedWorkflow => {
  const errors: Problem[] = [];
  const workflow = parseWorkflow({
    error: (at, message) => {
      errors.push({ line: at.line, column: at.column, message });
    },
  })(source);
  return { errors, ...optional("workflow")(workflow) };
};

export const workflowOf = (source: Source): ParsedWorkflow =>
  Option.getOrElse(Option.fromNullishOr(parsed.get(source)), () => {
    const result = parse(source);
    parsed.set(source, result);
    return result;
  });
