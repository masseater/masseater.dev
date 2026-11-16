import { expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Song } from "#/entities/song/index.ts";

import { ENTRY, filesOf, messagesOf, songIn, validSong } from "./read-song.test.support.ts";

const PLUGINS = `plugin ott from "./plugins/ott.ts" {
  depth: percent = 50%
  time: time = 10ms
  upward: bool = true
}
plugin surge from "./plugins/surge.ts" {
  patch: string
  cutoff: hertz = 800Hz
}
`;

const songWith = (body: string): string => `song "plugins"
${PLUGINS}
instrument lead plugin surge patch "Pluck" cutoff 1200Hz
track lead instrument lead role melody fx [ott depth 30%, comp -12dB 4:1]
${body}
bar meter 4/4 tempo 120bpm {
  lead: C4 1/1
}
`;

const trackFx = (song: Song): readonly unknown[] =>
  pipe(
    song.tracks,
    Arr.flatMap((track) => track.fx),
    Arr.filter((effect) => effect.kind === "plugin"),
  );

it.effect("declares plugins and fills in the defaults where they are used", () =>
  Effect.gen(function* declared() {
    const song = yield* validSong(songWith(""));
    expect(
      pipe(
        song.plugins,
        Arr.map((plugin) => `${plugin.name} ${plugin.module} ${String(plugin.params.length)}`),
      ),
    ).toStrictEqual(["ott ./plugins/ott.ts 3", "surge ./plugins/surge.ts 2"]);
    expect(trackFx(song)).toStrictEqual([
      {
        kind: "plugin",
        plugin: "ott",
        module: "./plugins/ott.ts",
        arguments: [
          { name: "depth", value: { kind: "share", value: 0.3 } },
          { name: "time", value: { kind: "milliseconds", value: 10 } },
          { name: "upward", value: { kind: "flag", value: true } },
        ],
      },
    ]);
    expect(
      pipe(
        song.instruments,
        Arr.map((instrument) => instrument.source),
      ),
    ).toStrictEqual([
      {
        kind: "plugin",
        plugin: "surge",
        module: "./plugins/surge.ts",
        arguments: [
          { name: "patch", value: { kind: "text", value: "Pluck" } },
          { name: "cutoff", value: { kind: "hertz", value: 1200 } },
        ],
      },
    ]);
  }),
);

it.effect("checks the names and types of what a plugin is given", () =>
  Effect.gen(function* checked() {
    const messages = yield* messagesOf(`song "bad"
${PLUGINS}
plugin broken from "./broken.ts" {
  mix: percent = 3dB
}
instrument lead plugin surge cutoff 3dB
track lead instrument lead fx [ott depth 30% size 2, ott depth 1/4]
`);
    expect(messages).toStrictEqual([
      "mix には percent を渡します。decibels は渡せません",
      "patch を渡します",
      "cutoff には hertz を渡します。decibels は渡せません",
      "ott の size は無いか、2 回渡しています",
      "depth には percent を渡します。duration は渡せません",
    ]);
  }),
);

it.effect("automates a plugin parameter by plugin and name", () =>
  Effect.gen(function* automated() {
    const song = yield* validSong(
      songWith(`bar meter 4/4 tempo 120bpm {
  lead: C4 1/1
  automate lead.ott.depth 10 -> 80 over 1bar
}`),
    );
    expect(
      pipe(
        song.automations,
        Arr.map((automation) => automation.parameter),
      ),
    ).toStrictEqual(["ott.depth"]);
    const messages = yield* messagesOf(
      songWith(`bar meter 4/4 tempo 120bpm {
  lead: C4 1/1
  automate lead.ott.size 10 -> 80 over 1bar
}`),
    );
    expect(Arr.isReadonlyArrayNonEmpty(messages)).toBe(true);
  }),
);

it.effect("imports plugins from a library and rebases their modules", () =>
  Effect.gen(function* imported() {
    const song = yield* songIn(
      filesOf({
        [ENTRY]: `import { ott } from "../lib/fx.fumx"
song "imported"
track pad audio fx [ott]
bar meter 4/4 tempo 120bpm {
  pad: rest 1/1
}
`,
        "/lib/fx.fumx": `plugin ott from "./ott.ts" {
  depth: percent = 50%
}
`,
      }),
    );
    expect(
      pipe(
        song.plugins,
        Arr.map((plugin) => plugin.module),
      ),
    ).toStrictEqual(["../lib/ott.ts"]);
    expect(
      pipe(
        song.tracks,
        Arr.flatMap((track) => track.fx),
        Arr.head,
        Option.map((effect) => effect.kind === "plugin" && effect.module),
      ),
    ).toStrictEqual(Option.some("../lib/ott.ts"));
  }),
);
