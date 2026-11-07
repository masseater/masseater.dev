import { Option, String as Str, Array as Arr, pipe } from "effect";
import { Parser as XmlParser } from "htmlparser2";

import type { Parser, Span, Unit } from "./parser.ts";
import { looksLikeProse } from "./prose.ts";

const NO_OFFSET = 0;

const DECLARATION = /^\s*(?:<\?xml\b|<(?:rss|feed|rdf:RDF)\b)/u;

const ATTRIBUTE = /\s[\w:.-]+\s*=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)')/gu;

const CDATA_OPEN = "<![CDATA[".length;

const CDATA_CLOSE = "]]>".length;

const COMMENT_OPEN = "<!--".length;

const COMMENT_CLOSE = "-->".length;

const INCLUSIVE = 1;

const looksLikeXml = (text: string): boolean => DECLARATION.test(text);

const attributeUnits = (text: string, { start, end }: Span): readonly Unit[] =>
  pipe(
    [...pipe(text, Str.slice(start, end), Str.matchAll(ATTRIBUTE))],
    Arr.flatMap((match) => {
      const [whole] = match;
      const value = Option.getOrElse(
        Option.fromNullishOr(match.groups).pipe(
          Option.flatMapNullishOr(({ double, single }) => double ?? single),
        ),
        () => "",
      );
      if (!looksLikeProse(value)) {
        return [];
      }
      const from = start + (match.index ?? NO_OFFSET) + whole.length - value.length - "'".length;
      return [{ kind: "prose", start: from, end: from + value.length } satisfies Unit];
    }),
  );

const xmlUnitsOf = (text: string): readonly Unit[] => {
  const units: Unit[] = [];
  let inCdata = false;
  const parser = new XmlParser(
    {
      onopentag: (): void => {
        units.push(
          ...attributeUnits(text, {
            start: parser.startIndex,
            end: parser.endIndex + INCLUSIVE,
          }),
        );
      },
      oncdatastart: (): void => {
        inCdata = true;
      },
      oncdataend: (): void => {
        inCdata = false;
      },
      ontext: (data): void => {
        const end = parser.endIndex + INCLUSIVE;
        if (inCdata) {
          units.push({
            kind: "nested",
            format: "",
            start: parser.startIndex + CDATA_OPEN,
            end: end - CDATA_CLOSE,
          });
        } else if (looksLikeProse(data) && Str.trim(data) !== "") {
          units.push({ kind: "prose", start: end - data.length, end });
        }
      },
      oncomment: (): void => {
        units.push({
          kind: "prose",
          start: parser.startIndex + COMMENT_OPEN,
          end: parser.endIndex + INCLUSIVE - COMMENT_CLOSE,
        });
      },
    },
    { xmlMode: true, decodeEntities: false },
  );
  parser.end(text);
  return units;
};

const xmlParser: Parser = {
  format: "xml",
  extensions: [
    ".xml",
    ".rss",
    ".atom",
    ".rdf",
    ".svg",
    ".xliff",
    ".xlf",
    ".plist",
    ".kml",
    ".gpx",
    ".opml",
    ".resx",
  ],
  accepts: looksLikeXml,
  unitsOf: xmlUnitsOf,
};

export { xmlParser };
