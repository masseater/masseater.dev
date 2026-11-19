import { Array as Arr, Match, Option, pipe } from "effect";

import { pitchOf } from "#/shared/lib/units.ts";
import type {
  Edit as EditNode,
  Hit as HitNode,
  Note as NoteNode,
  Slice as SliceNode,
  Sounding,
} from "#generated/langium/ast.ts";

import {
  argsOf,
  bendOf,
  everyOf,
  fadeOf,
  misplacedOnEdit,
  misplacedOnHit,
  misplacedOnNote,
  misplacedOnSound,
  noteFieldsOf,
  paramsOf,
  releaseVelocityOf,
  tieOf,
  velocityOf,
} from "./attributes.ts";
import type { Item, LineKind, NoteItem, Placed } from "./items.ts";
import { problemAt, problemsOf } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";
import { sourceOf } from "./source.ts";

export type Items = Compiled<readonly Item[]>;

interface Context {
  readonly sounding: Sounding;
  readonly placed: Placed;
}

type HeadOf<Node> = From<Node, From<Context, Items>>;

const repeatedPitchesOf: From<readonly NoteNode[], readonly Problem[]> = (pitches) =>
  pipe(
    pitches,
    Arr.filter((pitch, index) => {
      const midi = Option.map(pitchOf(pitch.pitch), (found) => found.midi);
      return pipe(
        Arr.take(pitches, index),
        Arr.some(
          (before) =>
            Option.isSome(midi) &&
            Option.contains(
              Option.map(pitchOf(before.pitch), (found) => found.midi),
              midi.value,
            ),
        ),
      );
    }),
    Arr.map((pitch) =>
      problemAt(pitch)("pitch")(`${pitch.pitch} と同じ高さの音が和音にもうあります`),
    ),
  );

const notesOf: HeadOf<readonly NoteNode[]> =
  (pitches) =>
  ({ sounding, placed }) => {
    const fields = noteFieldsOf(sounding.attributes);
    const notes = pipe(
      pitches,
      Arr.map((pitch) =>
        Option.match(pitchOf(pitch.pitch), {
          onNone: () => ({
            value: Option.none<NoteItem>(),
            problems: [problemAt(pitch)("pitch")(`${pitch.pitch} は音名として読めません`)],
          }),
          onSome: ({ midi, cents }) => ({
            value: Option.some<NoteItem>({
              ...placed,
              ...sourceOf(pitch),
              ...fields,
              kind: "note",
              midi,
              cents,
              spelling: pitch.pitch,
            }),
            problems: [],
          }),
        }),
      ),
    );
    return {
      value: pipe(
        notes,
        Arr.map((note) => note.value),
        Arr.getSomes,
      ),
      problems: [
        ...problemsOf(notes),
        ...repeatedPitchesOf(pitches),
        ...misplacedOnNote(sounding.attributes),
      ],
    };
  };

const hitOf =
  (kit: Extract<LineKind, { kind: "kit" }>): HeadOf<HitNode> =>
  (hit) =>
  ({ sounding, placed }) => {
    if (!Arr.contains(kit.voices, hit.voice)) {
      const voices = Arr.join(kit.voices, ", ");
      return {
        value: [],
        problems: [
          problemAt(hit)("voice")(
            `${hit.voice} は kit ${kit.kit} にありません。あるのは ${voices} です`,
          ),
        ],
      };
    }
    const { attributes } = sounding;
    return {
      value: [
        {
          ...placed,
          kind: "hit",
          voice: hit.voice,
          velocity: velocityOf(attributes),
          releaseVelocity: releaseVelocityOf(attributes),
          tie: tieOf(attributes),
          bend: bendOf(attributes),
          params: paramsOf(attributes),
          args: argsOf(attributes),
        },
      ],
      problems: misplacedOnHit(attributes),
    };
  };

const sliceOf: HeadOf<SliceNode> =
  (slice) =>
  ({ sounding, placed }) => {
    const { attributes } = sounding;
    return {
      value: [
        {
          ...placed,
          kind: "slice",
          sample: slice.sample.$refText,
          index: slice.index,
          velocity: velocityOf(attributes),
          params: paramsOf(attributes),
        },
      ],
      problems: misplacedOnSound(attributes),
    };
  };

const editOf: HeadOf<EditNode> =
  (edit) =>
  ({ sounding, placed }) => {
    const { attributes } = sounding;
    return {
      value: [
        {
          ...placed,
          kind: "edit",
          edit: edit.kind,
          every: everyOf(attributes),
          fadeMilliseconds: fadeOf(attributes),
        },
      ],
      problems: misplacedOnEdit(attributes),
    };
  };

const wrongOf =
  (what: string): From<Sounding, Items> =>
  (sounding) => ({
    value: [],
    problems: [problemAt(sounding)("head")(`${what}はこのトラックに書けません`)],
  });

export interface HeadSetting {
  readonly kind: LineKind;
  readonly placed: Placed;
}

export const headItemsOf =
  ({ kind, placed }: HeadSetting): From<Sounding, Items> =>
  (sounding) =>
    Match.value(sounding.head).pipe(
      Match.discriminatorsExhaustive("$type")({
        Note: (note) => {
          if (kind.kind !== "instrument") {
            return wrongOf("音高")(sounding);
          }
          return notesOf([note])({ sounding, placed });
        },
        Chord: (chord) => {
          if (kind.kind !== "instrument") {
            return wrongOf("和音")(sounding);
          }
          return notesOf(chord.notes)({ sounding, placed });
        },
        Hit: (hit) => {
          if (kind.kind !== "kit") {
            return wrongOf(`${hit.voice} `)(sounding);
          }
          return hitOf(kind)(hit)({ sounding, placed });
        },
        Slice: (slice) => {
          if (kind.kind !== "audio") {
            return wrongOf("スライス")(sounding);
          }
          return sliceOf(slice)({ sounding, placed });
        },
        Edit: (edit) => editOf(edit)({ sounding, placed }),
        Computed: () => wrongOf("計算した値")(sounding),
      }),
    );
