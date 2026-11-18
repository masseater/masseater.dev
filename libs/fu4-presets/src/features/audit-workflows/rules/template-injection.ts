import { Array as Arr, Option, pipe } from "effect";

import { dataflowContexts } from "#/entities/expression-tree/index.ts";
import { extractAllFenced, parseBare } from "#/features/audit-workflows/lib/expressions.ts";
import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  hidden,
  primary,
  withSubfeature,
} from "#/features/audit-workflows/lib/location.ts";
import type { Audit, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";
import { subfeatureOf } from "#/shared/subfeature/index.ts";
import type { Subfeature } from "#/shared/subfeature/index.ts";

import { scriptsOf } from "./template-injection-sinks.ts";
import { classify } from "./template-injection-verdict.ts";
import type { Verdict } from "./template-injection-verdict.ts";

const meta = {
  ident: "template-injection",
  desc: "code injection via template expansion",
} as const;

const injectable = (text: string, view: StepView): readonly (readonly [Subfeature, Verdict])[] =>
  Arr.flatMap(extractAllFenced(text), (fenced) =>
    Arr.flatMap(Option.toArray(parseBare(fenced.expr.raw)), (parsed) => {
      const bad = Arr.flatMap(dataflowContexts(parsed), ({ context, spanned }) =>
        Arr.map(
          Option.toArray(classify(view)(context)),
          (verdict) =>
            [
              subfeatureOf(fenced.start + spanned.origin.start)(spanned.origin.raw),
              verdict,
            ] as const,
        ),
      );
      if (Arr.isReadonlyArrayEmpty(bad)) {
        return [
          [
            subfeatureOf(fenced.start)(parsed.origin.raw),
            ["low", "high", "pedantic"] as Verdict,
          ] as const,
        ];
      }
      return bad;
    }),
  );

const step = (view: StepView): Drafts =>
  Arr.flatMap(scriptsOf(view), (script) =>
    Arr.map(injectable(script.text, view), ([subfeature, [level, certainty, who]]) =>
      pipe(
        finding(meta),
        severity(level),
        confidence(certainty),
        persona(who),
        at(hidden(view.location)),
        atPath(
          script.location,
          primary,
          withSubfeature(subfeature),
          annotated("may expand into attacker-controllable code"),
        ),
        at(...script.related),
      ),
    ),
  );

export const templateInjection: Audit = { ...meta, step, compositeStep: step };
