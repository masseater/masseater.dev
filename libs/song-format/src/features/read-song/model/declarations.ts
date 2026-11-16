import { Array as Arr, Match, Option, pipe } from "effect";
import type { Predicate } from "effect";

import type { Song, Track } from "#/entities/song/index.ts";
import { ticksOf } from "#/shared/lib/ticks.ts";
import { millisecondsOf, pitchOf, shareOf } from "#/shared/lib/units.ts";
import {
  isBus,
  isDelay,
  isDuck,
  isGroove,
  isInstrument,
  isKit,
  isMaster,
  isRole,
  isSample,
  isTrack,
} from "#generated/langium/ast.ts";
import type {
  Bus,
  Declaration,
  Duck,
  FxChain,
  Instrument,
  Kit,
  Sample,
  SingleSample,
  Song as SongNode,
  Track as TrackNode,
  TrackSource,
  Zone,
} from "#generated/langium/ast.ts";

import { effectOf, playParamOf, sendOf } from "./params.ts";
import { problemAt, problemsOf } from "./problem.ts";
import type { Compiled, From, Problem } from "./problem.ts";

export type Declarations = Pick<
  Song,
  "groove" | "samples" | "kits" | "instruments" | "buses" | "tracks" | "ducks" | "master"
>;

const NONE = 0;

const effectsOf: From<FxChain | undefined, Declarations["master"]> = (chain) =>
  pipe(
    Option.fromNullishOr(chain),
    Option.match({ onNone: () => [], onSome: (fx) => pipe(fx.effects, Arr.map(effectOf)) }),
  );

const rootOf: From<Zone | SingleSample, Compiled<number>> = (node) =>
  Option.match(pitchOf(node.root), {
    onNone: () => ({
      value: NONE,
      problems: [problemAt(node)("root")(`${node.root} は音名として読めません`)],
    }),
    onSome: (pitch) => ({ value: pitch.midi, problems: [] }),
  });

const instrumentOf: From<Instrument, Compiled<Declarations["instruments"][number]>> = (node) => {
  const zones: readonly (Zone | SingleSample)[] = Match.value(node.source).pipe(
    Match.discriminatorsExhaustive("$type")({
      MultiSample: (multi) => multi.zones,
      SingleSample: (single) => [single],
    }),
  );
  const roots = pipe(zones, Arr.map(rootOf));
  return {
    value: {
      name: node.name,
      zones: pipe(
        Arr.zip(zones, roots),
        Arr.map(([zone, root]) => ({ path: zone.path, root: root.value })),
      ),
    },
    problems: problemsOf(roots),
  };
};

const trackSourceOf: From<TrackSource, Track["source"]> = (source) =>
  Match.value(source).pipe(
    Match.discriminatorsExhaustive("$type")({
      KitSource: (kit): Track["source"] => ({ kind: "kit", kit: kit.kit.$refText }),
      InstrumentRef: (ref): Track["source"] => ({
        kind: "instrument",
        instrument: ref.instrument.$refText,
      }),
      AudioSource: (): Track["source"] => ({ kind: "audio" }),
    }),
  );

const trackOf: From<TrackNode, Track> = (node) => ({
  name: node.name,
  source: trackSourceOf(node.source),
  role: pipe(Option.fromNullishOr(node.role), Option.filter(isRole)),
  fx: effectsOf(node.fx),
  sends: pipe(node.sends, Arr.map(sendOf)),
});

const duckOf: From<Duck, Compiled<Declarations["ducks"][number]>> = (node) => {
  const targets = pipe(
    node.targets,
    Arr.map((target) => target.$refText),
  );
  return {
    value: {
      targets,
      source: node.source.$refText,
      holdMilliseconds: millisecondsOf(node.hold),
      releaseMilliseconds: millisecondsOf(node.release),
      depths: pipe(
        node.depths,
        Arr.map((depth) => ({ target: depth.target.$refText, amount: shareOf(depth.amount) })),
      ),
    },
    problems: pipe(
      node.depths,
      Arr.filter((depth) => !Arr.contains(targets, depth.target.$refText)),
      Arr.map((depth) =>
        problemAt(depth)("target")(`${depth.target.$refText} は duck の対象に入っていません`),
      ),
    ),
  };
};

const grooveOf: From<SongNode, Compiled<Declarations["groove"]>> = (song) =>
  pipe(
    song.declarations,
    Arr.filter(isGroove),
    Arr.head,
    Option.match({
      onNone: () => ({ value: Option.none(), problems: [] }),
      onSome: (node) =>
        Option.match(ticksOf(node.grid), {
          onNone: () => ({
            value: Option.none(),
            problems: [problemAt(node)("grid")(`${node.grid} は細かすぎて表せません`)],
          }),
          onSome: (grid) => ({
            value: Option.some({ grid, amount: shareOf(node.amount) }),
            problems: [],
          }),
        }),
    }),
  );

const chainsOf: From<Declaration, readonly FxChain[]> = (declaration) => {
  if (isTrack(declaration) || isBus(declaration) || isMaster(declaration)) {
    return pipe(Option.fromNullishOr(declaration.fx), Option.toArray);
  }
  return [];
};

const delayProblemsOf: From<SongNode, readonly Problem[]> = (song) =>
  pipe(
    song.declarations,
    Arr.flatMap(chainsOf),
    Arr.flatMap((chain) => chain.effects),
    Arr.filter(isDelay),
    Arr.flatMap((delay) =>
      pipe(
        Option.fromNullishOr(delay.beats),
        Option.filter((beats) => Option.isNone(ticksOf(beats))),
        Option.map((beats) => problemAt(delay)("beats")(`${beats} は細かすぎて表せません`)),
        Option.toArray,
      ),
    ),
  );

type Named = Sample | Kit | Instrument | Bus | TrackNode;

const namespaceOf: From<Named, string> = (node) => {
  if (isBus(node) || isTrack(node)) {
    return "mixable";
  }
  return node.$type;
};

const isNamed: Predicate.Refinement<Declaration, Named> = (declaration) =>
  isSample(declaration) ||
  isKit(declaration) ||
  isInstrument(declaration) ||
  isBus(declaration) ||
  isTrack(declaration);

const duplicateProblemsOf: From<SongNode, readonly Problem[]> = (song) => {
  const named = pipe(song.declarations, Arr.filter(isNamed));
  return pipe(
    named,
    Arr.filter((node, index) =>
      Arr.findFirstIndex(
        named,
        (other) => other.name === node.name && namespaceOf(other) === namespaceOf(node),
      ).pipe(Option.exists((first) => first < index)),
    ),
    Arr.map((node) => problemAt(node)("name")(`${node.name} という名前はすでに使われています`)),
  );
};

const slicesOf: From<Sample, Declarations["samples"][number]["slices"]> = (sample) => {
  if (sample.onsets) {
    return Option.some({ kind: "onsets" });
  }
  return pipe(
    Option.fromNullishOr(sample.count),
    Option.map((count) => ({ kind: "count" as const, count })),
  );
};

const kitOf: From<Kit, Declarations["kits"][number]> = (kit) => ({
  name: kit.name,
  voices: pipe(
    kit.voices,
    Arr.map((voice) => ({
      name: voice.name,
      path: voice.path,
      params: pipe(voice.params, Arr.map(playParamOf)),
    })),
  ),
});

export const declarationsOf: From<SongNode, Compiled<Declarations>> = (song) => {
  const instruments = pipe(song.declarations, Arr.filter(isInstrument), Arr.map(instrumentOf));
  const ducks = pipe(song.declarations, Arr.filter(isDuck), Arr.map(duckOf));
  const groove = grooveOf(song);
  return {
    value: {
      groove: groove.value,
      samples: pipe(
        song.declarations,
        Arr.filter(isSample),
        Arr.map((sample) => ({ name: sample.name, path: sample.path, slices: slicesOf(sample) })),
      ),
      kits: pipe(song.declarations, Arr.filter(isKit), Arr.map(kitOf)),
      instruments: pipe(
        instruments,
        Arr.map((instrument) => instrument.value),
      ),
      buses: pipe(
        song.declarations,
        Arr.filter(isBus),
        Arr.map((bus) => ({
          name: bus.name,
          fx: effectsOf(bus.fx),
          sends: pipe(bus.sends, Arr.map(sendOf)),
        })),
      ),
      tracks: pipe(song.declarations, Arr.filter(isTrack), Arr.map(trackOf)),
      ducks: pipe(
        ducks,
        Arr.map((duck) => duck.value),
      ),
      master: pipe(
        song.declarations,
        Arr.filter(isMaster),
        Arr.flatMap((master) => effectsOf(master.fx)),
      ),
    },
    problems: [
      ...groove.problems,
      ...problemsOf(instruments),
      ...problemsOf(ducks),
      ...delayProblemsOf(song),
      ...duplicateProblemsOf(song),
    ],
  };
};
