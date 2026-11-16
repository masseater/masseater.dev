import { Array as Arr, Option, Schema, pipe } from "effect";

export type Level = "section" | "subsection";

export type Heading = Readonly<{ id: string; value: string; level: Level }>;

export type NumberedHeading = Heading & Readonly<{ number: string }>;

const FOOTNOTE_LABEL_ID = "footnote-label";

const SubsectionSchema = Schema.Struct({ id: Schema.String, value: Schema.String });

const SectionSchema = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  children: Schema.optionalKey(Schema.Array(SubsectionSchema)),
});

const decodeToc = Schema.decodeUnknownOption(Schema.Array(SectionSchema));

const flatten = ({ id, value, children = [] }: typeof SectionSchema.Type): readonly Heading[] => [
  { id, value, level: "section" },
  ...pipe(
    children,
    Arr.map((child) => ({ ...child, level: "subsection" as const })),
  ),
];

export const headingsOf = (tableOfContents: unknown): readonly Heading[] =>
  pipe(
    decodeToc(tableOfContents),
    Option.getOrElse((): readonly (typeof SectionSchema.Type)[] => []),
    Arr.filter(({ id }) => id !== FOOTNOTE_LABEL_ID),
    Arr.flatMap(flatten),
  );

type Counter = Readonly<{ section: number; subsection: number }>;

const STEP = 1;

const START: Counter = { section: 0, subsection: 0 };

const advance = (counter: Counter, heading: Heading): Counter => {
  if (heading.level === "section") {
    return { section: counter.section + STEP, subsection: START.subsection };
  }
  return { ...counter, subsection: counter.subsection + STEP };
};

const label = (counter: Counter, heading: Heading): string => {
  if (heading.level === "section") {
    return `${counter.section}`;
  }
  return `${counter.section}.${counter.subsection}`;
};

const numberHeading = (counter: Counter, heading: Heading): readonly [Counter, NumberedHeading] => {
  const counted = advance(counter, heading);
  return [counted, { ...heading, number: label(counted, heading) }];
};

export const numbered = (headings: readonly Heading[]): readonly NumberedHeading[] =>
  pipe(headings, Arr.mapAccum(START, numberHeading), ([, result]) => result);
