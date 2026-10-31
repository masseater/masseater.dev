import { Effect, Option, Record as Rec, String as Str, pipe } from "effect";

import type { GpuEffect } from "./effect";

const SHADER_DIR = "../shaders/";
const EXTENSION = ".frag";

const loaders = pipe(
  import.meta.glob<string>("../shaders/*.frag", { query: "?raw", import: "default" }),
  Rec.mapKeys((path) => pipe(path, Str.slice(SHADER_DIR.length, -EXTENSION.length))),
);

const gpuLoaders = pipe(
  import.meta.glob<GpuEffect>("../shaders/*.frag", {
    query: "?webgpu",
    import: "default",
  }),
  Rec.mapKeys((path) => pipe(path, Str.slice(SHADER_DIR.length, -EXTENSION.length))),
);

const loadEffect = (slug: string): Effect.Effect<Option.Option<string>> =>
  Option.match(Rec.get(loaders, slug), {
    onNone: () => Effect.succeedNone,
    onSome: (load) => Effect.promise(load).pipe(Effect.asSome),
  });

const loadGpuEffect = (slug: string): Effect.Effect<Option.Option<GpuEffect>> =>
  Option.match(Rec.get(gpuLoaders, slug), {
    onNone: () => Effect.succeedNone,
    onSome: (load) => Effect.promise(load).pipe(Effect.asSome),
  });

export { loadEffect, loadGpuEffect };
