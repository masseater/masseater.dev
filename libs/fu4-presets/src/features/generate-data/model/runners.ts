import { Array as Arr, Effect, Option, Predicate, String as Str, pipe } from "effect";
import type { HttpClient } from "effect/http";
import type { Element } from "hast";
import { selectAll } from "hast-util-select";
import type { ListItem, Root, RootContent } from "mdast";
import { toString as textOf } from "mdast-util-to-string";

import type { GenerateDataError } from "./errors.ts";
import { renderDocs } from "./liquid.ts";
import {
  bodyRows,
  htmlOf,
  inlineCodes,
  parseHtml,
  parseMarkdown,
  sectionTitled,
  sections,
  tablesOf,
  textOfHtml,
} from "./markdown.ts";
import type { Section } from "./markdown.ts";
import { LARGER_RUNNERS, SELF_HOSTED, STANDARD_RUNNERS } from "./sources.ts";

const AVAILABLE = /^Available (?<os>\S+) /u;
const IMAGE_PATH = /^.*\//u;
const DEFAULT_LABELS = "Using default labels to route jobs";
const OPERATING_SYSTEM = "operating system";

export interface HostedLabel {
  readonly label: string;
  readonly os: string;
  readonly image: string;
}

export interface SelfHostedLabels {
  readonly os: readonly string[];
  readonly other: readonly string[];
}

export interface Runners {
  readonly hosted: readonly HostedLabel[];
  readonly selfHosted: SelfHostedLabels;
}

const hrefOf = (link: Element): string =>
  pipe(
    Option.liftPredicate(link.properties, Predicate.hasProperty("href")),
    Option.map((properties) => properties.href),
    Option.filter(Str.isString),
    Option.getOrElse(() => ""),
  );

const standardRow = (row: Element): readonly HostedLabel[] => {
  const cells = selectAll("td", row);
  const os = pipe(
    Arr.head(cells),
    Option.map(textOfHtml),
    Option.getOrElse(() => ""),
  );
  return pipe(
    Arr.last(cells),
    Option.map((cell) => selectAll("code > a", cell)),
    Option.getOrElse(Arr.empty<Element>),
    Arr.map((link) => ({
      label: textOfHtml(link),
      os: Str.toLowerCase(os),
      image: Str.replace(IMAGE_PATH, "")(hrefOf(link)),
    })),
  );
};

const standardRunners = (root: Root): readonly HostedLabel[] => {
  const html = parseHtml(pipe(root.children, Arr.map(htmlOf), Arr.join("")));
  return pipe(selectAll("tr", html), Arr.flatMap(standardRow));
};

const largerLabels =
  (os: string) =>
  (cell: RootContent, index: number): readonly HostedLabel[] =>
    pipe(
      parseHtml(htmlOf(cell)),
      (html) => selectAll("code", html),
      Arr.map((code) => ({
        label: textOfHtml(code),
        os: Str.toLowerCase(os),
        image: `${os}-larger-${String(index)}`,
      })),
    );

const largerSection = (section: Section): readonly HostedLabel[] =>
  pipe(
    Option.fromNullishOr(AVAILABLE.exec(section.title)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap((groups) => Option.fromNullishOr(groups["os"])),
    Option.map((os) =>
      pipe(
        tablesOf(section),
        Arr.flatMap((table) =>
          pipe(
            bodyRows(table),
            Arr.map((row) => Arr.last(row.children)),
            Arr.getSomes,
            Arr.flatMap(largerLabels(os)),
          ),
        ),
      ),
    ),
    Option.getOrElse(Arr.empty<HostedLabel>),
  );

const isOperatingSystem = (item: ListItem): boolean => Str.includes(OPERATING_SYSTEM)(textOf(item));

const codesOf = (items: readonly ListItem[]): readonly string[] =>
  pipe(items, Arr.flatMap(inlineCodes), Arr.map(Str.toLowerCase));

const selfHostedRunners = (root: Root): SelfHostedLabels => {
  const items = pipe(
    sectionTitled(DEFAULT_LABELS)(root),
    Option.flatMap((section) => Arr.findFirst(section.nodes, (node) => node.type === "list")),
    Option.map((list) => list.children),
    Option.getOrElse(Arr.empty<ListItem>),
  );
  return {
    os: codesOf(pipe(items, Arr.filter(isOperatingSystem))),
    other: codesOf(
      pipe(
        items,
        Arr.filter((item) => !isOperatingSystem(item)),
      ),
    ),
  };
};

/** @internal */
export const runners: Effect.Effect<Runners, GenerateDataError, HttpClient.HttpClient> = Effect.gen(
  function* runners() {
    const [standard, larger, selfHosted] = yield* Effect.all(
      [renderDocs(STANDARD_RUNNERS), renderDocs(LARGER_RUNNERS), renderDocs(SELF_HOSTED)],
      { concurrency: "unbounded" },
    );
    const largerLabelsFound = pipe(sections(parseMarkdown(larger)), Arr.flatMap(largerSection));
    const hosted = Arr.dedupeWith(
      [...standardRunners(parseMarkdown(standard)), ...largerLabelsFound],
      (left, right) => left.label === right.label,
    );
    return { hosted, selfHosted: selfHostedRunners(parseMarkdown(selfHosted)) };
  },
);
