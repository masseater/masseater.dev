import { Option } from "effect";

import type { Kind } from "#/shared/config/index.ts";
import { present } from "#/shared/lib/present.ts";

export const FSD_LAYERS: readonly string[] = [
  "app",
  "pages",
  "widgets",
  "features",
  "entities",
  "shared",
];

const SLICED: readonly string[] = ["pages", "widgets", "features", "entities"];
const SCRIPTS: readonly string[] = ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"];
const RUST: readonly string[] = ["**/*.rs"];

export interface PresetOptions {
  readonly paths?: readonly string[];
}

const pathsOf = ({ paths }: PresetOptions): Pick<Kind, "paths"> =>
  present(Option.fromUndefinedOr(paths), (value) => ({ paths: value }));

export const workspace = (options: PresetOptions = {}): Kind => ({
  name: "workspace",
  marker: "package.json",
  ...pathsOf(options),
  placements: [
    {
      files: SCRIPTS,
      allow: ["src/**", "bin/**", "*.config.{ts,mts,js,mjs}", "alchemy.*.ts", "*.d.{ts,mts,cts}"],
      message:
        "sits outside src/. Put every module of a workspace under src/ in an FSD layer; only bin/, *.config.ts, alchemy.*.ts and *.d.ts may stay at the workspace root.",
    },
  ],
  layers: {
    dir: "src",
    files: SCRIPTS,
    order: FSD_LAYERS,
    sliced: SLICED,
    segmented: ["shared"],
    entries: ["index.*"],
    open: ["shared/lib/**", "shared/ui/**"],
    cross: "@x",
  },
});

export const rustCrate = (options: PresetOptions = {}): Kind => ({
  name: "crate",
  marker: "Cargo.toml",
  ...pathsOf(options),
  placements: [
    {
      files: RUST,
      allow: ["src/**", "build.rs", "benches/**", "tests/**"],
      message:
        "sits outside src/. Put every module of a crate under src/ in an FSD layer; only build.rs, benches/ and tests/ may stay outside.",
    },
  ],
  layers: {
    dir: "src",
    files: RUST,
    order: FSD_LAYERS,
    sliced: SLICED,
    segmented: ["shared"],
    loose: ["lib.rs", "main.rs", "bin/**"],
    moduleFiles: true,
  },
});

export const skill = (options: PresetOptions = {}): Kind => ({
  name: "skill",
  marker: "SKILL.md",
  ...pathsOf(options),
  placements: [
    {
      files: ["**"],
      allow: ["SKILL.md", "usecases/**", "references/**", "scripts/**", "assets/**"],
      message:
        "is not part of an Agent Skill's layout. A skill holds SKILL.md, usecases/, references/, scripts/ and assets/.",
    },
  ],
});

export const fsd = (options: PresetOptions = {}): readonly Kind[] => [
  workspace(options),
  rustCrate(options),
];
