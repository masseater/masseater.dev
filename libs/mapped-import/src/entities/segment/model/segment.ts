import { Array as Arr, Match, Option, Schema, String as Str, pipe } from "effect";

export type Span = Readonly<{ start: number; end: number }>;

export type Segment =
  | Readonly<{ kind: "text"; text: string }>
  | (Span & Readonly<{ kind: "verbatim" }>)
  | (Span & Readonly<{ kind: "alias"; text: string }>)
  | (Span & Readonly<{ kind: "atom"; text: string }>);

export type Rendering = Readonly<{ content: string; segments: readonly Segment[] }>;

export type Named = Readonly<{ name: string; span: Option.Option<Span> }>;

const PLAIN_NAME = /^[^"\\\r\n]*$/u;

const QUOTE = '"';

const encodeString = Schema.encodeOption(Schema.fromJsonString(Schema.String));

export const quoted = (value: string): string =>
  Option.getOrElse(encodeString(value), () => `${QUOTE}${QUOTE}`);

export const text = (value: string): Segment => ({ kind: "text", text: value });

export const nameLiteral = ({ name, span }: Named): readonly Segment[] =>
  Option.match(span, {
    onNone: () => [text(quoted(name))],
    onSome: ({ start, end }) =>
      Match.value(PLAIN_NAME.test(name)).pipe(
        Match.when(true, (): readonly Segment[] => [
          text(QUOTE),
          { kind: "verbatim", start, end },
          text(QUOTE),
        ]),
        Match.orElse((): readonly Segment[] => [{ kind: "alias", text: quoted(name), start, end }]),
      ),
  });

export const renderSegments = ({ content, segments }: Rendering): string =>
  pipe(
    segments,
    Arr.map((segment) =>
      Match.value(segment).pipe(
        Match.discriminatorsExhaustive("kind")({
          text: ({ text: value }) => value,
          verbatim: ({ start, end }) => pipe(content, Str.slice(start, end)),
          alias: ({ text: value }) => value,
          atom: ({ text: value }) => value,
        }),
      ),
    ),
    Arr.join(""),
  );
