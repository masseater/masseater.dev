import { Predicate, Result, Array as Arr, String as Str, pipe } from "effect";
import ICAL from "ical.js";

import { proseUnitsOf } from "./located.ts";
import type { Parser, Unit } from "./parser.ts";

type Component = InstanceType<typeof ICAL.Component>;

const escaped = (value: string): string =>
  pipe(
    value,
    Str.replaceAll("\\", String.raw`\\`),
    Str.replaceAll(";", ";"),
    Str.replaceAll(",", String.raw`\,`),
    Str.replaceAll("\n", String.raw`\n`),
  );

const textsIn = (component: Component): readonly string[] => [
  ...pipe(
    component.getAllProperties(),
    Arr.filter(({ type }) => type === "text"),
    Arr.flatMap((property): readonly unknown[] => property.getValues().flat()),
    Arr.filter((value) => Predicate.isString(value)),
  ),
  ...pipe(
    component.getAllSubcomponents(),
    Arr.flatMap((child) => textsIn(child)),
  ),
];

const valueUnitsOf = (text: string): readonly Unit[] =>
  proseUnitsOf({ text, folded: true })(
    Result.match(
      Result.try(() => ICAL.Component.fromString(text)),
      {
        onFailure: () => [],
        onSuccess: (component) =>
          pipe(
            textsIn(component),
            Arr.map((value) => escaped(value)),
          ),
      },
    ),
  );

const icsParser: Parser = {
  format: "ics",
  extensions: [".ics", ".ical", ".ifb"],
  aliases: ["icalendar", "ical"],
  accepts: (text) => /^BEGIN:VCALENDAR\b/mu.test(text),
  unitsOf: valueUnitsOf,
};

const vcardParser: Parser = {
  format: "vcard",
  extensions: [".vcf", ".vcard"],
  aliases: ["vcf"],
  accepts: (text) => /^BEGIN:VCARD\b/mu.test(text),
  unitsOf: valueUnitsOf,
};

const CALENDAR_PARSERS: readonly Parser[] = [icsParser, vcardParser];

export { CALENDAR_PARSERS, icsParser, vcardParser };
