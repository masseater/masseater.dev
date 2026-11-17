import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import type { HttpClient } from "effect/http";
import { toString as textOf } from "mdast-util-to-string";

import type { Fu4Error } from "#/shared/lib/errors.ts";

import { renderDocs } from "./liquid.ts";
import { bodyRows, parseHtml, parseMarkdown, sections, tablesOf } from "./markdown.ts";
import type { Section } from "./markdown.ts";
import { EVENTS } from "./sources.ts";

const INTRODUCTION = "About events that trigger workflows";
const EVENT_DEPTH = 2;
const CUSTOM = "Custom";
const NOT_APPLICABLE = "Not applicable";
const ACTIVITY_COLUMN = 1;
const INTRODUCTION_SECTIONS = 1;

export type ActivityTypes = readonly string[] | "custom";

const activityTypes = (cell: string): ActivityTypes => {
  if (cell === CUSTOM) {
    return "custom";
  }
  if (cell === NOT_APPLICABLE) {
    return [];
  }
  const text = textOf(parseHtml(cell));
  return pipe(Str.split(text, "- "), Arr.map(Str.trim), Arr.filter(Str.isNonEmpty));
};

const eventOf = (section: Section): Option.Option<readonly [string, ActivityTypes]> =>
  pipe(
    Arr.head(tablesOf(section)),
    Option.flatMap((table) => Arr.head(bodyRows(table))),
    Option.flatMap((row) => Arr.get(row.children, ACTIVITY_COLUMN)),
    Option.map((cell) => [section.title, activityTypes(Str.trim(textOf(cell)))] as const),
  );

/** @internal */
export const webhooks: Effect.Effect<
  Record<string, ActivityTypes>,
  Fu4Error,
  HttpClient.HttpClient
> = Effect.map(renderDocs(EVENTS), (source) =>
  pipe(
    sections(parseMarkdown(source)),
    Arr.filter((section) => section.depth === EVENT_DEPTH),
    Arr.dropWhile((section) => section.title !== INTRODUCTION),
    Arr.drop(INTRODUCTION_SECTIONS),
    Arr.map(eventOf),
    Arr.getSomes,
    Rec.fromEntries,
  ),
);
