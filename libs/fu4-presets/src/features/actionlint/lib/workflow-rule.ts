import { defineRule } from "@r_masseater/fu4";
import type { Position, Rule, RuleContext } from "@r_masseater/fu4";
import { Function as Fn, Option, Record as Rec } from "effect";

import { workflowOf } from "#/entities/workflow/index.ts";
import type { Job, Step, Workflow } from "#/entities/workflow/model/job-types.ts";
import type { Event } from "#/entities/workflow/model/types.ts";

export interface Visitor {
  readonly workflowPre: (workflow: Workflow) => void;
  readonly jobPre: (job: Job) => void;
  readonly step: (step: Step) => void;
  readonly jobPost: (job: Job) => void;
  readonly workflowPost: (workflow: Workflow) => void;
}

export const NOOP: Visitor = {
  workflowPre: Fn.constVoid,
  jobPre: Fn.constVoid,
  step: Fn.constVoid,
  jobPost: Fn.constVoid,
  workflowPost: Fn.constVoid,
};

export type Fail = (at: Position, message: string) => void;

export const eachEvent =
  (check: (event: Event) => void) =>
  (workflow: Workflow): void => {
    for (const event of Option.getOrElse(Option.fromNullishOr(workflow.on), () => [])) {
      check(event);
    }
  };

export interface WorkflowRule {
  readonly description: string;
  readonly docs: string;
  readonly visitor: (fail: Fail, context: RuleContext) => Visitor;
}

const visitJob = (visitor: Visitor, job: Job): void => {
  visitor.jobPre(job);
  for (const step of Option.getOrElse(Option.fromNullishOr(job.steps), () => [])) {
    visitor.step(step);
  }
  visitor.jobPost(job);
};

const visit = (visitor: Visitor, workflow: Workflow): void => {
  visitor.workflowPre(workflow);
  for (const job of Rec.values(Option.getOrElse(Option.fromNullishOr(workflow.jobs), () => ({})))) {
    visitJob(visitor, job);
  }
  visitor.workflowPost(workflow);
};

export const workflowRule = (rule: WorkflowRule): Rule =>
  defineRule({
    meta: { description: rule.description, docs: rule.docs, kinds: ["workflow"] },
    check: (context) => {
      for (const workflow of Option.toArray(
        Option.fromNullishOr(workflowOf(context.source).workflow),
      )) {
        const fail: Fail = (at, message) => {
          context.report({ line: at.line, column: at.column, message });
        };
        visit(rule.visitor(fail, context), workflow);
      }
    },
  });
