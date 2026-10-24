import { Array as Arr, Option, Schema, pipe } from "effect";
import type { MDXModule } from "mdx/types";

type Level = "section" | "subsection";

type Heading = Readonly<{ id: string; value: string; level: Level }>;

const FOOTNOTE_LABEL_ID = "footnote-label";

const SubsectionSchema = Schema.Struct({ id: Schema.String, value: Schema.String });

const SectionSchema = Schema.Struct({
  id: Schema.String,
  value: Schema.String,
  children: Schema.optionalKey(Schema.Array(SubsectionSchema)),
});

const decodeToc = Schema.decodeUnknownOption(Schema.Array(SectionSchema));

const headingsOf = ({
  id,
  value,
  children = [],
}: typeof SectionSchema.Type): readonly Heading[] => [
  { id, value, level: "section" },
  ...pipe(
    children,
    Arr.map((child) => ({ ...child, level: "subsection" as const })),
  ),
];

const tocOf = ({ tableOfContents }: Readonly<MDXModule>): readonly Heading[] =>
  pipe(
    decodeToc(tableOfContents),
    Option.getOrElse((): readonly (typeof SectionSchema.Type)[] => []),
    Arr.filter(({ id }) => id !== FOOTNOTE_LABEL_ID),
    Arr.flatMap(headingsOf),
  );

export type { Heading, Level };
export { tocOf };
