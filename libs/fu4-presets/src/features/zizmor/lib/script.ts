import type { ScriptLanguage, Source, SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import type { StepView } from "#/features/zizmor/model/step.ts";
import { descendants, fieldOf, fieldsOf, isType, ofType } from "#/shared/syntax/index.ts";

import { normalizeShell } from "./shell.ts";

export type ScriptParser = (language: ScriptLanguage, text: string) => Source;

export type Dialect = "bash" | "pwsh" | "cmd";

export interface Command {
  readonly name: string;
  readonly args: readonly string[];
  readonly span: SyntaxNode;
}

const DIALECTS: ReadonlyMap<string, Dialect> = new Map([
  ["bash", "bash"],
  ["sh", "bash"],
  ["zsh", "bash"],
  ["cmd", "cmd"],
  ["pwsh", "pwsh"],
  ["powershell", "pwsh"],
]);

const LANGUAGES = { bash: "bash", pwsh: "powershell" } as const;

const PWSH_ARGS = ["command_argument", "command_parameter"] as const;

const PWSH_ELEMENTS = [
  ...PWSH_ARGS,
  "redirection",
  "comment",
  "line_continuation",
  "verbatim_arguments",
] as const;

export const shellOf = (step: StepView): string =>
  Option.match(step.shell(), { onNone: () => "bash", onSome: ([shell]) => shell });

export const dialectOf = (step: StepView): Option.Option<Dialect> =>
  pipe(shellOf(step), normalizeShell, (shell) => Option.fromNullishOr(DIALECTS.get(shell)));

export const scriptDialectOf = (step: StepView): Option.Option<"bash" | "pwsh"> =>
  Option.filter(dialectOf(step), (dialect): dialect is "bash" | "pwsh" => dialect !== "cmd");

export const treeOf =
  (parse: ScriptParser) =>
  (dialect: "bash" | "pwsh", text: string): Option.Option<SyntaxNode> =>
    Option.fromNullishOr(parse(LANGUAGES[dialect], text).syntax);

const bashCommand = (node: SyntaxNode): Option.Option<Command> => {
  const args = pipe(
    fieldsOf("argument")(node),
    Arr.filter((child) => child.named),
  );
  if (!Arr.isReadonlyArrayNonEmpty(args)) {
    return Option.none();
  }
  return Option.map(fieldOf("name")(node), (name) => ({
    name: name.text,
    args: pipe(
      args,
      Arr.map((arg) => arg.text),
    ),
    span: node,
  }));
};

const pwshName = (name: SyntaxNode): Option.Option<SyntaxNode> => {
  if (name.type === "invocation_operator_command") {
    return ofType("command_argument")(fieldOf("command")(name));
  }
  return Option.liftPredicate(name, isType("command_name"));
};

const pwshCommand = (node: SyntaxNode): Option.Option<Command> => {
  const elements = pipe(
    node.children,
    Arr.filter((child) => child.field !== "name" && isType(...PWSH_ELEMENTS)(child)),
  );
  if (!Arr.isReadonlyArrayNonEmpty(elements)) {
    return Option.none();
  }
  return pipe(
    fieldOf("name")(node),
    Option.flatMap(pwshName),
    Option.map((name) => ({
      name: name.text,
      args: pipe(
        elements,
        Arr.filter(isType(...PWSH_ARGS)),
        Arr.map((arg) => arg.text),
      ),
      span: node,
    })),
  );
};

const COMMANDS = { bash: bashCommand, pwsh: pwshCommand } as const;

export const commandsOf =
  (dialect: "bash" | "pwsh") =>
  (root: SyntaxNode): readonly Command[] =>
    pipe(
      descendants(root),
      Arr.filter(isType("command")),
      Arr.flatMap((node) => Option.toArray(COMMANDS[dialect](node))),
    );
