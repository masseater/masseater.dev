import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { atPath, confidence, finding, severity } from "#/features/audit-workflows/lib/finding.ts";
import { annotated, primary, withKeys } from "#/features/audit-workflows/lib/location.ts";
import { dialectOf, treeOf } from "#/features/audit-workflows/lib/script.ts";
import type { Dialect, ScriptParser } from "#/features/audit-workflows/lib/script.ts";
import { hasEvent } from "#/features/audit-workflows/lib/workflow.ts";
import type { Audit, AuditContext, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";
import {
  descendants,
  fieldOf,
  fieldsOf,
  isType,
  namedOfType,
  ofType,
} from "#/shared/syntax/index.ts";

const meta = { ident: "github-env", desc: "dangerous use of environment file" } as const;

const BASH_DESTINATION = /^(?:GITHUB_ENV|GITHUB_PATH)$/u;
const PWSH_DESTINATION = /ENV:GITHUB_ENV|ENV:GITHUB_PATH/iu;
const PWSH_WRITER = /out-file|add-content|set-content|tee-object/iu;
const TEE = /tee/u;
const CMD_WRITE = /^.+\s*>>?\s*"?%(?<destination>GITHUB_ENV|GITHUB_PATH)%"?.*$/gimu;
const ECHOES = new Set(["echo", "printf"]);

const matching =
  (pattern: RegExp) =>
  (nodes: readonly SyntaxNode[]): readonly string[] =>
    pipe(
      nodes,
      Arr.map((node) => node.text),
      Arr.filter((text) => pattern.test(text)),
    );

const bashTargets = (node: SyntaxNode): readonly SyntaxNode[] => {
  if (node.type === "string") {
    return pipe(node.namedChildren, Arr.flatMap(namedOfType("variable_name")));
  }
  if (isType("expansion", "simple_expansion")(node)) {
    return namedOfType("variable_name")(node);
  }
  return [];
};

const bashDestinations = (nodes: readonly SyntaxNode[]): readonly string[] =>
  matching(BASH_DESTINATION)(pipe(nodes, Arr.flatMap(bashTargets)));

const SINGLE = 1;
const NEXT = 1;

const isSafeArg = (arg: SyntaxNode): boolean =>
  isType("word", "raw_string")(arg) ||
  (arg.namedChildren.length === SINGLE &&
    pipe(arg.namedChildren, Arr.every(isType("string_content"))));

const isStaticEcho = (command: SyntaxNode): boolean =>
  Option.exists(fieldOf("name")(command), (name) => ECHOES.has(name.text)) &&
  pipe(
    fieldsOf("argument")(command),
    Arr.filter((arg) => arg.named),
    Arr.every(isSafeArg),
  );

const isFlaggedCommand = (command: SyntaxNode): boolean =>
  command.type === "command" &&
  Option.isSome(ofType("command_name")(fieldOf("name")(command))) &&
  !isStaticEcho(command);

const bashRedirects = (statement: SyntaxNode): readonly string[] =>
  pipe(
    statement.namedChildren,
    Arr.flatMap((command, index) => {
      if (!isFlaggedCommand(command)) {
        return [];
      }
      return pipe(
        Arr.drop(statement.namedChildren, index + NEXT),
        Arr.filter(isType("file_redirect")),
        Arr.flatMap((redirect) => bashDestinations(redirect.namedChildren)),
      );
    }),
  );

const namedMatching =
  (pattern: RegExp) =>
  (command: SyntaxNode): boolean =>
    command.type === "command" &&
    Option.exists(ofType("command_name")(fieldOf("name")(command)), (name) =>
      pattern.test(name.text),
    );

const bashTees = (pipeline: SyntaxNode): readonly string[] =>
  pipe(
    namedOfType("command")(pipeline),
    Arr.filter(namedMatching(TEE)),
    Arr.flatMap((command) => bashDestinations(fieldsOf("argument")(command))),
  );

const pwshVariables = (node: SyntaxNode): readonly SyntaxNode[] => {
  if (node.type === "expandable_string") {
    return namedOfType("variable")(node);
  }
  return Arr.filter([node], isType("variable"));
};

const pwshArgument = (argument: SyntaxNode): readonly SyntaxNode[] =>
  pipe(
    argument.namedChildren,
    Arr.flatMap((child) => {
      if (child.type === "array_literal_expression") {
        return Arr.flatMap(namedOfType("command_argument")(child), (inner) =>
          pipe(inner.namedChildren, Arr.flatMap(pwshVariables)),
        );
      }
      return pwshVariables(child);
    }),
  );

const pwshRedirects = (redirection: SyntaxNode): readonly string[] => {
  if (Option.isNone(ofType("file_redirection_operator")(fieldOf("operator")(redirection)))) {
    return [];
  }
  return pipe(
    ofType("command_argument")(fieldOf("destination")(redirection)),
    Option.toArray,
    Arr.flatMap((destination) => pipe(destination.namedChildren, Arr.flatMap(pwshVariables))),
    matching(PWSH_DESTINATION),
  );
};

const pwshParameterArgument = (child: SyntaxNode): readonly SyntaxNode[] => {
  if (child.type === "command_argument") {
    return [child];
  }
  if (child.type === "command_parameter") {
    return Option.toArray(ofType("command_argument")(fieldOf("value")(child)));
  }
  return [];
};

const pwshArguments = (command: SyntaxNode): readonly SyntaxNode[] =>
  pipe(command.namedChildren, Arr.flatMap(pwshParameterArgument), Arr.flatMap(pwshArgument));

const pwshWriters = (pipeline: SyntaxNode): readonly string[] =>
  pipe(
    fieldsOf("elements")(pipeline),
    Arr.filter(namedMatching(PWSH_WRITER)),
    Arr.flatMap((command) => matching(PWSH_DESTINATION)(pwshArguments(command))),
  );

const collect =
  (root: SyntaxNode) =>
  (type: string, extract: (node: SyntaxNode) => readonly string[]): readonly string[] =>
    pipe(descendants(root), Arr.filter(isType(type)), Arr.flatMap(extract));

const bashWrites = (root: SyntaxNode): readonly string[] => [
  ...collect(root)("redirected_statement", bashRedirects),
  ...collect(root)("pipeline", bashTees),
];

const pwshWrites = (root: SyntaxNode): readonly string[] => [
  ...collect(root)("redirection", pwshRedirects),
  ...collect(root)("pipeline", pwshWriters),
];

const cmdWrites = (run: string): readonly string[] =>
  Arr.flatMap([...Str.matchAll(CMD_WRITE)(run)], (match) =>
    pipe(
      Option.fromNullishOr(match.groups),
      Option.flatMap(Rec.get("destination")),
      Option.toArray,
    ),
  );

const TREE_WRITES = { bash: bashWrites, pwsh: pwshWrites } as const;

export const environmentWrites =
  (parse: ScriptParser) =>
  (dialect: Dialect, run: string): readonly string[] => {
    if (dialect === "cmd") {
      return cmdWrites(run);
    }
    return Arr.flatMap(Option.toArray(treeOf(parse)(dialect, run)), TREE_WRITES[dialect]);
  };

const check = (step: StepView, context: AuditContext): Drafts => {
  const { body } = step;
  if (body.type !== "run") {
    return [];
  }
  return pipe(
    Option.toArray(dialectOf(step)),
    Arr.flatMap((dialect) => environmentWrites(context.parseScript)(dialect, body.run)),
    Arr.map((destination) =>
      pipe(
        finding(meta),
        severity("high"),
        confidence("low"),
        atPath(
          step.location,
          primary,
          withKeys("run"),
          annotated(`write to ${destination} may allow code execution`),
        ),
      ),
    ),
  );
};

const hasDangerousTrigger = (step: StepView): boolean =>
  Option.exists(
    step.job,
    (job) =>
      hasEvent(job.workflow)("workflow_run") || hasEvent(job.workflow)("pull_request_target"),
  );

export const githubEnv: Audit = {
  ...meta,
  step: (step, context) => {
    if (!hasDangerousTrigger(step)) {
      return [];
    }
    return check(step, context);
  },
  compositeStep: check,
};
