import type { SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { fieldsOf } from "#/shared/syntax/index.ts";

import { commandNameOf } from "./command-name.ts";

export interface Write {
  readonly node: SyntaxNode;
  readonly name: string;
  readonly integer: boolean;
}

const NEXT = 1;
const IDENTIFIER = /^[A-Za-z_]\w*$/u;
const DESCRIPTOR = /^\{(?<name>[A-Za-z_]\w*)\}$/u;
const READ_OPTIONS_WITH_VALUE = new Set(["-a", "-d", "-i", "-n", "-N", "-p", "-t", "-u"]);
const MAPFILE_OPTIONS_WITH_VALUE = new Set(["-d", "-n", "-O", "-s", "-u", "-C", "-c"]);

const isIdentifier = (node: SyntaxNode): boolean =>
  node.type === "word" && IDENTIFIER.test(node.text);

const operands = (args: readonly SyntaxNode[], withValue: ReadonlySet<string>): SyntaxNode[] => {
  const found: SyntaxNode[] = [];
  let skip = false;
  for (const arg of args) {
    if (skip) {
      skip = false;
    } else if (withValue.has(arg.text)) {
      skip = true;
    } else if (!Str.startsWith("-")(arg.text)) {
      found.push(arg);
    }
  }
  return found;
};

const after = (args: readonly SyntaxNode[], flag: string): readonly SyntaxNode[] =>
  pipe(
    Arr.findFirstIndex(args, (arg) => arg.text === flag),
    Option.flatMap((index) => Arr.get(args, index + NEXT)),
    Option.toArray,
  );

const targetsOf = (name: string, args: readonly SyntaxNode[]): readonly SyntaxNode[] => {
  switch (name) {
    case "read": {
      return operands(args, READ_OPTIONS_WITH_VALUE);
    }
    case "mapfile":
    case "readarray": {
      return pipe(Arr.last(operands(args, MAPFILE_OPTIONS_WITH_VALUE)), Option.toArray);
    }
    case "printf": {
      return after(args, "-v");
    }
    case "wait": {
      return after(args, "-p");
    }
    case "getopts": {
      const found = operands(args, new Set());
      return pipe(Arr.get(found, NEXT), Option.toArray);
    }
    default: {
      return [];
    }
  }
};

export const descriptorOf = (node: SyntaxNode): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(DESCRIPTOR.exec(node.text)),
    Option.flatMapNullishOr((match) => match.groups),
    Option.flatMapNullishOr((groups) => groups["name"]),
  );

export const commandWrites = (command: SyntaxNode): readonly Write[] => {
  const name = Option.getOrElse(commandNameOf(command), () => "");
  const args = fieldsOf("argument")(command);
  const integer = name === "wait";
  const named = pipe(
    targetsOf(name, args),
    Arr.filter(isIdentifier),
    Arr.map((node): Write => ({ node, name: node.text, integer })),
  );
  const descriptors = pipe(
    args,
    Arr.flatMap((node) =>
      pipe(
        descriptorOf(node),
        Option.map((found): Write => ({ node, name: found, integer: true })),
        Option.toArray,
      ),
    ),
  );
  return [...named, ...descriptors];
};
