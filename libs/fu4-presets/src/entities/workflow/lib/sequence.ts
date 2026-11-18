import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Predicate, String as Str, pipe } from "effect";

import { quote, sortedQuotes } from "#/shared/text/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { parseString } from "./scalar.ts";
import type { Sink } from "./sink.ts";

const EMPTY = 0;
const ONE = 1;

export interface UnexpectedInput {
  readonly key: Text;
  readonly section: string;
  readonly expected: readonly string[];
}

const sectionName = (section: string): string => {
  if (Str.includes(" ")(section)) {
    return section;
  }
  return `${quote(section)} section`;
};

const unexpectedMessage = (input: UnexpectedInput): string => {
  const section = sectionName(input.section);
  const key = quote(input.key.value);
  const [first] = input.expected;
  if (input.expected.length === ONE && Predicate.isNotUndefined(first)) {
    return `expected ${quote(first)} key for ${section} but got ${key}`;
  }
  if (input.expected.length === EMPTY) {
    return `unexpected key ${key} for ${section}`;
  }
  return `unexpected key ${key} for ${section}. expected one of ${sortedQuotes(input.expected)}`;
};

export const unexpectedKey =
  (sink: Sink) =>
  (input: UnexpectedInput): void => {
    sink.error(input.key, unexpectedMessage(input));
  };

export const reportEmpty =
  (sink: Sink) =>
  (section: string, node: YamlNode): void => {
    sink.error(node, `${quote(section)} section should not be empty`);
  };

export const checkNotEmpty =
  (sink: Sink) =>
  (section: string, node: YamlNode): boolean => {
    if (node.children.length === EMPTY) {
      reportEmpty(sink)(section, node);
      return false;
    }
    return true;
  };

export interface SequenceInput {
  readonly section: string;
  readonly node: YamlNode;
  readonly allowEmpty: boolean;
}

export interface StringsInput extends SequenceInput {
  readonly allowElementEmpty: boolean;
}

export const checkSequence =
  (sink: Sink) =>
  (input: SequenceInput): boolean => {
    const { node, section } = input;
    if (node.kind !== "sequence") {
      sink.error(
        node,
        `${quote(section)} section must be sequence node but got ${node.kind} node with ${quote(node.tag)} tag`,
      );
      return false;
    }
    return input.allowEmpty || checkNotEmpty(sink)(section, node);
  };

export const parseStringSequence =
  (sink: Sink) =>
  (input: StringsInput): readonly Text[] => {
    if (!checkSequence(sink)(input)) {
      return [];
    }
    return pipe(
      input.node.children,
      Arr.map((child) => parseString(sink)(child, input.allowElementEmpty)),
    );
  };

export const parseStringOrSequence =
  (sink: Sink) =>
  (input: StringsInput): readonly Text[] => {
    const { node } = input;
    if (node.kind !== "scalar") {
      return parseStringSequence(sink)(input);
    }
    if (input.allowEmpty && node.tag === "!!null") {
      return [];
    }
    return [parseString(sink)(node, input.allowElementEmpty)];
  };
