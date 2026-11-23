import { Option, Record as Rec, pipe } from "effect";

import { isExpressionAssigned } from "#/entities/workflow/index.ts";
import type { Container, Job, Service } from "#/entities/workflow/index.ts";
import { NOOP, workflowRule } from "#/features/check-workflows/lib/workflow-rule.ts";
import type { Fail, Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";
import { quote } from "#/shared/text/index.ts";

const checkContainer =
  (fail: Fail) =>
  (place: string, container: Container): void => {
    const password = pipe(
      Option.fromNullishOr(container.credentials),
      Option.flatMap((found) => Option.fromNullishOr(found.password)),
      Option.filter((found) => !isExpressionAssigned(found.value)),
    );
    for (const found of Option.toArray(password)) {
      fail(
        found,
        `"password" section in ${place} should be specified via secrets. do not put password value directly`,
      );
    }
  };

export const servicesOf = (job: Job): readonly Service[] =>
  pipe(
    Option.fromNullishOr(job.services),
    Option.match({ onNone: () => [], onSome: (services) => Rec.values(services.value) }),
  );

export const credentials = workflowRule({
  description: "Reports container passwords written directly instead of through secrets",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-hardcoded-credentials",
  visitor: (fail): Visitor => ({
    ...NOOP,
    jobPre: (job) => {
      for (const container of Option.toArray(Option.fromNullishOr(job.container))) {
        checkContainer(fail)('"container" section', container);
      }
      for (const service of servicesOf(job)) {
        checkContainer(fail)(`${quote(service.name.value)} service`, service.container);
      }
    },
  }),
});
