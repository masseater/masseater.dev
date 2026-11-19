import type { Source, SyntaxNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";

import { checkCommand } from "./commands.ts";
import { sortedFindings } from "./finding.ts";
import type { Finding, State } from "./finding.ts";
import { cleanReads } from "./flow/index.ts";
import { hasError } from "./node.ts";
import { checkSingleQuoted } from "./quotes.ts";
import { checkPipeline, checkRedirect, checkSequence } from "./sequences.ts";
import {
  checkAssignment,
  checkCommandWrites,
  checkDeclaration,
  checkLoopVariable,
  checkMaskedReturns,
  checkName,
  checkTestUse,
  isReportedUnused,
} from "./variables.ts";
import { checkExpansion, checkSubstitution } from "./words.ts";

export { CODES } from "./codes.ts";

const LITERAL_DOLLAR = /\$(?=\\)/gu;

export const parseableScript = (script: string): string =>
  Str.replaceAll(LITERAL_DOLLAR, "_")(script);
export type { Finding } from "./finding.ts";
export { messageOf } from "./finding.ts";

type Check = (state: State) => (node: SyntaxNode) => void;

const CHECKS: Readonly<Record<string, Check>> = {
  simple_expansion: checkExpansion,
  expansion: checkExpansion,
  command_substitution: checkSubstitution,
  command: (state) => (node) => {
    checkCommand(state)(node);
    checkCommandWrites(state)(node);
  },
  for_statement: checkLoopVariable,
  unary_expression: checkTestUse,
  declaration_command: (state) => (node) => {
    checkDeclaration(state)(node);
    checkMaskedReturns(state)(node);
  },
  raw_string: checkSingleQuoted,
  pipeline: checkPipeline,
  redirected_statement: checkRedirect,
  variable_assignment: checkAssignment,
  variable_name: checkName,
};

const visit =
  (state: State) =>
  (node: SyntaxNode): void => {
    checkSequence(state)(node);
    for (const check of Option.toArray(Rec.get(CHECKS, node.type))) {
      check(state)(node);
    }
    for (const child of node.namedChildren) {
      visit(state)(child);
    }
  };

const findingsIn = (source: string, root: SyntaxNode): readonly Finding[] => {
  const findings: Finding[] = [];
  const assigned = new Map<string, Finding>();
  const used = new Set<string>();
  const state: State = {
    source,
    cleanReads: cleanReads(root),
    add: (finding) => {
      findings.push(finding);
    },
    assign: (finding) => {
      assigned.set(finding.subject, finding);
    },
    use: (name) => {
      used.add(name);
    },
  };
  visit(state)(root);
  const unused = pipe(
    Arr.fromIterable(assigned.values()),
    Arr.filter((finding) => !used.has(finding.subject) && isReportedUnused(finding.subject)),
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
