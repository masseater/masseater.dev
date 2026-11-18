import { Array as Arr, Option, Result, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { describe } from "#/entities/expression/model/types.ts";

import { checkerOf } from "./checker.ts";
import { parse } from "./parser.ts";

const run = (
  src: string,
  key = "jobs.<job_id>.steps.run",
): { readonly type: string; readonly errors: readonly string[] } => {
  const checker = checkerOf({ untrusted: true, configVars: Option.none() });
  checker.setWorkflowKey(key);
  const checked = checker.check(Result.getOrThrow(parse(src).result));
  return {
    type: describe(checked.type),
    errors: pipe(
      checked.errors,
      Arr.map((found) => found.message),
    ),
  };
};

test("types documented contexts and literals", () => {
  expect(run("github.event_name == 'push' }}")).toStrictEqual({ type: "bool", errors: [] });
  expect(run("fromJSON('{\"a\": [1, 2]}') }}").type).toBe("{a: array<number>}");
});

test("reports undefined variables and unknown properties", () => {
  expect(run("foo }}").errors).toStrictEqual([
    expect.stringMatching(/^undefined variable "foo"\. available variables are /u),
  ]);
  expect(run("job.nope }}").errors).toStrictEqual([
    expect.stringMatching(/^property "nope" is not defined in object type \{/u),
  ]);
});

test("checks format placeholders and call arity", () => {
  expect(run("format('{0}', 1, 2) }}").errors).toStrictEqual([
    'format string "{0}" does not contain placeholder {1}. remove argument which is unused in the format string',
  ]);
  expect(run("startsWith('a') }}").errors).toStrictEqual([
    expect.stringMatching(
      /^number of arguments is wrong\. function "startsWith\(string, string\) -> bool" takes 2/u,
    ),
  ]);
});

test("checks context availability and untrusted inputs", () => {
  expect(run("secrets.x }}", "jobs.<job_id>.if").errors).toStrictEqual([
    expect.stringMatching(/^context "secrets" is not allowed here\. available contexts are /u),
  ]);
  expect(run("github.event.issue.title }}").errors).toStrictEqual([
    expect.stringMatching(/^"github\.event\.issue\.title" is potentially untrusted/u),
  ]);
});
