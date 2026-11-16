import { Array as Arr, Match, Option, pipe } from "effect";

import type { Song } from "#/entities/song/index.ts";
import { pitchOf } from "#/shared/lib/units.ts";
import type { Instrument, SingleSample, Zone } from "#generated/langium/ast.ts";

import { pluginUseOf } from "./plugins.ts";
import { problemAt, problemsOf } from "./problem.ts";
import type { Compiled, From } from "./problem.ts";

type SourceOf = Song["instruments"][number]["source"];

const NONE = 0;

const rootOf: From<Zone | SingleSample, Compiled<number>> = (node) =>
  Option.match(pitchOf(node.root), {
    onNone: () => ({
      value: NONE,
      problems: [problemAt(node)("root")(`${node.root} は音名として読めません`)],
    }),
    onSome: (pitch) => ({ value: pitch.midi, problems: [] }),
  });

const samplesOf: From<readonly (Zone | SingleSample)[], Compiled<SourceOf>> = (zones) => {
  const roots = pipe(
    zones,
    Arr.map((zone) => rootOf(zone)),
  );
  return {
    value: {
      kind: "samples",
      zones: pipe(
        Arr.zip(zones, roots),
        Arr.map(([zone, root]) => ({ path: zone.path, root: root.value })),
      ),
    },
    problems: problemsOf(roots),
  };
};

export const instrumentOf: From<Instrument, Compiled<Song["instruments"][number]>> = (node) => {
  const source: Compiled<SourceOf> = Match.value(node.source).pipe(
    Match.discriminatorsExhaustive("$type")({
      MultiSample: (multi) => samplesOf(multi.zones),
      SingleSample: (single) => samplesOf([single]),
      PluginInstrument: (plugin): Compiled<SourceOf> => ({
        value: pluginUseOf(plugin.use).value,
        problems: [],
      }),
    }),
  );
  return { value: { name: node.name, source: source.value }, problems: source.problems };
};
