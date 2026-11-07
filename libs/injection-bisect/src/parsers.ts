import { CALENDAR_PARSERS } from "./calendar.ts";
import { codeParsersBesides } from "./code.ts";
import { csvParser, tsvParser } from "./csv.ts";
import { htmlParser } from "./html.ts";
import { jsonLinesParser, jsonParser } from "./json.ts";
import { markdownParser } from "./markdown.ts";
import type { Parser } from "./parser.ts";
import { SUBTITLE_PARSERS } from "./subtitles.ts";
import { xmlParser } from "./xml.ts";
import { yamlParser } from "./yaml.ts";

const OWN_PARSERS: readonly Parser[] = [
  jsonParser,
  jsonLinesParser,
  ...SUBTITLE_PARSERS,
  ...CALENDAR_PARSERS,
  xmlParser,
  yamlParser,
  tsvParser,
  csvParser,
  markdownParser,
  htmlParser,
];

const DEFAULT_PARSERS: readonly Parser[] = [
  jsonParser,
  jsonLinesParser,
  ...SUBTITLE_PARSERS,
  ...CALENDAR_PARSERS,
  ...codeParsersBesides(OWN_PARSERS),
  xmlParser,
  yamlParser,
  tsvParser,
  csvParser,
  markdownParser,
  htmlParser,
];

export { DEFAULT_PARSERS };
