import { Array as Arr, Effect, Option, Record as Rec, String as Str, pipe } from "effect";
import { parseGlsl, parseWgsl, validate, writeWgsl } from "naga-wasm";
import type { Plugin } from "vite-plus";

import { parseEffect, SCREEN } from "./src/features/dance-stage/model/effect.ts";
import type { GpuCompute, GpuEffect, GpuPass } from "./src/features/dance-stage/model/effect.ts";

const QUERY = "?webgpu";
const FRAGMENT = ".frag";
const SEPARATOR = "/";
const INPUT = /^uniform sampler2D (?<name>\w+);$/u;
const SAMPLE = "textureSample(";
const LEVEL = ", 0.0)";
const OUTPUT = /return FragmentOutput\((?<color>\w+)\);/gu;
const CLAMPED = "return FragmentOutput(clamp($<color>, vec4<f32>(0.0), vec4<f32>(1.0)));";
const OPEN = "(";
const CLOSE = ")";
const NEXT = 1;
const START = 0;
const OUTSIDE = 0;

type Prelude = Readonly<{ header: string; body: string }>;

type Read = (path: string) => Promise<Uint8Array>;

const inputOf = (line: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(INPUT.exec(line)),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap((groups) => Rec.get(groups, "name")),
  );

const inputsOf = (frag: string): readonly string[] =>
  pipe(
    Str.split(frag, "\n"),
    Arr.flatMap((line) => Option.toArray(inputOf(line))),
  );

const declaration = (name: string, binding: number): string =>
  `layout(set = 1, binding = ${String(binding)}) uniform texture2D ${name}Texture;\n#define ${name} sampler2D(${name}Texture, linearSampler)`;

const declare = (frag: string): string => {
  const inputs = inputsOf(frag);
  return pipe(
    Str.split(frag, "\n"),
    Arr.map((line) =>
      pipe(
        inputOf(line),
        Option.flatMap((name) =>
          pipe(
            Arr.findFirstIndex(inputs, (input) => input === name),
            Option.map((binding) => declaration(name, binding)),
          ),
        ),
        Option.getOrElse(() => line),
      ),
    ),
    Arr.join("\n"),
  );
};

const depthChange = (char: Option.Option<string>): number =>
  Option.match(char, {
    onNone: () => -NEXT,
    onSome: (found) => Number(found === OPEN) - Number(found === CLOSE),
  });

const closingOf = (code: string, start: number): number => {
  const cursor = { depth: NEXT, index: start };
  while (cursor.depth > OUTSIDE) {
    cursor.depth += depthChange(Str.charAt(code, cursor.index));
    cursor.index += NEXT;
  }
  return cursor.index - NEXT;
};

const sampleLevels = (code: string): string =>
  Option.match(Str.indexOf(SAMPLE)(code), {
    onNone: () => code,
    onSome: (at) => {
      const open = at + SAMPLE.length;
      const close = closingOf(code, open);
      return `${Str.slice(START, at)(code)}textureSampleLevel(${Str.slice(open, close)(code)}${LEVEL}${sampleLevels(Str.slice(close + NEXT)(code))}`;
    },
  });

const wgslOf = (glsl: string): string => {
  const module = parseGlsl(glsl, { stage: "fragment" });
  const info = validate(module);
  const code = writeWgsl(module, info);
  info.free();
  module.free();
  return pipe(sampleLevels(code), Str.replaceAll(OUTPUT, CLAMPED));
};

const gpuPassesOf = ({
  source,
  prelude,
}: Readonly<{ source: string; prelude: Prelude }>): readonly GpuPass[] =>
  pipe(
    parseEffect(source).passes,
    Arr.map(({ frag }): GpuPass => ({
      code: wgslOf(`${prelude.header}\n${prelude.body}\n${declare(frag)}`),
      inputs: inputsOf(frag),
    })),
  );

const text = (read: Read, path: string): Effect.Effect<string> =>
  Effect.promise(() => read(path)).pipe(Effect.map((bytes) => new TextDecoder().decode(bytes)));

const siblingOf = (path: string, name: string): string =>
  pipe(
    Str.lastIndexOf(SEPARATOR)(path),
    Option.map((at) => `${Str.slice(START, at + NEXT)(path)}${name}`),
    Option.getOrElse(() => name),
  );

const DISPATCH = /^\/\/ dispatch: (?<count>\d+)$/mu;
const COMPUTE = ".wgsl";

const workgroupsOf = (body: string): number =>
  pipe(
    Option.fromNullishOr(DISPATCH.exec(body)),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap((groups) => Rec.get(groups, "count")),
    Option.map(Number),
    Option.getOrThrowWith(() => new Error("compute shader に // dispatch: が無い")),
  );

const computeOf = ({ body, prelude }: Readonly<{ body: string; prelude: string }>): GpuCompute => {
  const code = `const DENSITY = vec2<u32>(${String(SCREEN.width)}u, ${String(SCREEN.height)}u);\n${prelude}\n${body}`;
  const module = parseWgsl(code);
  validate(module).free();
  module.free();
  return { code, workgroups: workgroupsOf(body) };
};

const glslHeader = (header: string): string =>
  `#version 450\n#define WEBGPU 1\n#define DENSITY_WIDTH ${String(SCREEN.width)}\n#define DENSITY_HEIGHT ${String(SCREEN.height)}\n${header}`;

const optionalText = (read: Read, path: string): Effect.Effect<Option.Option<string>> =>
  Effect.tryPromise(() => read(path)).pipe(
    Effect.map((bytes) => new TextDecoder().decode(bytes)),
    Effect.option,
  );

const loadGpuEffect = (read: Read, path: string): Promise<string> => {
  const prelude = Effect.all({
    header: text(read, siblingOf(path, "prelude-webgpu.glsl")).pipe(Effect.map(glslHeader)),
    body: text(read, siblingOf(path, "prelude.glsl")),
  });
  const computes = Effect.all({
    body: optionalText(read, Str.replace(FRAGMENT, COMPUTE)(path)),
    prelude: text(read, siblingOf(path, "prelude-compute.wgsl")),
  }).pipe(
    Effect.map(({ body, prelude: computePrelude }) =>
      pipe(
        Option.toArray(body),
        Arr.map((found) => computeOf({ body: found, prelude: computePrelude })),
      ),
    ),
  );
  return Effect.runPromise(
    Effect.all({ source: text(read, path), prelude, computes }).pipe(
      Effect.map(({ source, prelude: fragmentPrelude, computes: found }): GpuEffect => ({
        passes: gpuPassesOf({ source, prelude: fragmentPrelude }),
        computes: found,
      })),
      Effect.map((effect) => `export default ${JSON.stringify(effect)};`),
    ),
  );
};

const danceShaders = (): Plugin => ({
  name: "dance-shaders",
  enforce: "pre",
  load(id) {
    const { fs } = this;
    return pipe(
      Option.liftPredicate(id, Str.endsWith(`${FRAGMENT}${QUERY}`)),
      Option.map((found) => Str.slice(START, -QUERY.length)(found)),
      Option.map((path) => {
        this.addWatchFile(path);
        this.addWatchFile(Str.replace(FRAGMENT, COMPUTE)(path));
        return loadGpuEffect((file) => fs.readFile(file), path);
      }),
      Option.getOrUndefined,
    );
  },
});

export { danceShaders };
