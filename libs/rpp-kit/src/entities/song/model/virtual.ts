import { nameLiteral, quoted, text } from "@r_masseater/mapped-import";
import type { Segment } from "@r_masseater/mapped-import";
import { Array as Arr, Option, pipe } from "effect";

import type { SongOutline, Spanned } from "./outline.ts";
import type { Param } from "./parse.ts";

export type VirtualInput = Readonly<{ outline: SongOutline; missing: readonly Param[] }>;

const NUMERIC = /^-?\d+(?:\.\d+)?$/u;

const keyOf = (param: Option.Option<Param>, fallback: string): readonly Segment[] =>
  Option.match(param, {
    onNone: () => nameLiteral({ name: fallback, span: Option.none() }),
    onSome: ({ text: name, start, end }) =>
      nameLiteral({ name, span: Option.some({ start, end }) }),
  });

const literalOf = ({ value, param }: Spanned): Segment =>
  pipe(
    param,
    Option.filter((found) => NUMERIC.test(found.text) && Number(found.text) === value),
    Option.match({
      onNone: () => text(String(value)),
      onSome: ({ start, end }): Segment => ({ kind: "verbatim", start, end }),
    }),
  );

const tempoSegments = ({ tempo }: SongOutline): readonly Segment[] => [
  text("  readonly tempo: { readonly bpm: "),
  literalOf(tempo.bpm),
  text("; readonly numerator: "),
  literalOf(tempo.numerator),
  text("; readonly denominator: "),
  literalOf(tempo.denominator),
  text(" };\n"),
];

const markerSegments = ({ markers }: SongOutline): readonly Segment[] =>
  pipe(
    markers,
    Arr.flatMap(({ marker, name, time }) => [
      text("    Marker & { readonly name: "),
      ...keyOf(name, marker.name),
      text("; readonly time: "),
      literalOf({ value: marker.time, param: time }),
      text(" },\n"),
    ]),
  );

const trackSegments = ({ tracks }: SongOutline): readonly Segment[] =>
  pipe(
    tracks,
    Arr.flatMap(({ track, name }) => [
      text(`    Track & { readonly index: ${String(track.index)}; readonly name: `),
      ...keyOf(name, track.name),
      text(" },\n"),
    ]),
  );

const missingSegments = (missing: readonly Param[]): readonly Segment[] =>
  pipe(
    missing,
    Arr.flatMap(({ text: file, start, end }): readonly Segment[] => [
      text("assetExists("),
      { kind: "atom", text: quoted(file), start, end },
      text(");\n"),
    ]),
  );

export const segmentsOf = ({ outline, missing }: VirtualInput): readonly Segment[] => [
  text('import type { Marker, Region, Section, TempoPoint, Track } from "rpp-kit";\n'),
  text('declare function assetExists(file: "このパスに素材のファイルがありません"): void;\n'),
  text("export declare const song: {\n"),
  ...tempoSegments(outline),
  text(
    `  readonly tempoMap: readonly TempoPoint[];\n  readonly sampleRate: ${String(outline.song.sampleRate)};\n  readonly length: number;\n  readonly markers: readonly [\n`,
  ),
  ...markerSegments(outline),
  text(
    "  ];\n  readonly regions: readonly Region[];\n  readonly sections: readonly Section[];\n  readonly tracks: readonly [\n",
  ),
  ...trackSegments(outline),
  text("  ];\n};\n"),
  ...missingSegments(missing),
];
