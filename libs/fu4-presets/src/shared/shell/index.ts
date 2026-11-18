import type { Source, SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { checkCommand } from "./commands.ts";
import { sortedFindings } from "./finding.ts";
import type { Finding, State } from "./finding.ts";
import { hasError } from "./node.ts";
import { checkAssignment, checkDeclaration, checkName } from "./variables.ts";
import { checkExpansion, checkSubstitution } from "./words.ts";

export { CODES } from "./codes.ts";
export type { Finding } from "./finding.ts";
export { messageOf } from "./finding.ts";

type Check = (state: State) => (node: SyntaxNode) => void;

const CHECKS: Readonly<Record<string, Check>> = {
  simple_expansion: checkExpansion,
  expansion: checkExpansion,
  command_substitution: checkSubstitution,
  command: checkCommand,
  declaration_command: checkDeclaration,
  variable_assignment: checkAssignment,
  variable_name: checkName,
};

const visit =
  (state: State) =>
  (node: SyntaxNode): void => {
    for (const check of Option.toArray(Rec.get(CHECKS, node.type))) {
      check(state)(node);
    }
    for (const child of node.namedChildren) {
      visit(state)(child);
    }
  };

const findingsIn = (source: string, root: SyntaxNode): readonly Finding[] => {
  const findings: Finding[] = [];
  const assigned: Finding[] = [];
  const used = new Set<string>();
  const state: State = {
    source,
    add: (finding) => {
      findings.push(finding);
    },
    assign: (finding) => {
      assigned.push(finding);
    },
    use: (name) => {
      used.add(name);
    },
  };
  visit(state)(root);
  const unused = pipe(
    assigned,
    Arr.filter((finding) => !used.has(finding.subject)),
  );
  return sortedFindings([...findings, ...unused]);
};

export const checkShell = (parsed: Source): readonly Finding[] =>
  pipe(
    Option.fromNullishOr(parsed.syntax),
    Option.filter((root) => !hasError(root)),
    Option.map((root) => findingsIn(parsed.text, root)),
    Option.getOrElse((): readonly Finding[] => []),
  );
