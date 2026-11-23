import { expressionVisitor } from "#/features/check-workflows/lib/expression/visitor.ts";
import { workflowRule } from "#/features/check-workflows/lib/workflow-rule.ts";
import type { Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";

export const expression = workflowRule({
  description: "Reports type errors, undefined properties and untrusted inputs in expressions",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-type-check-expression",
  visitor: (fail, context): Visitor => expressionVisitor({ fail, context }),
});
