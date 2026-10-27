import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import type { Pass } from "#/features/dance-stage/model/effect";

import type { Fn } from "./fn";
import { contextOf, link, makeBuffer, makeQuad, makeTexture } from "./gl";
import type { Buffer, Gl, Size } from "./gl";

const QUAD_VERTICES = 4;
const ORIGIN = 0;
const POSE_POINTS = 33;
const POSE_FIELDS = 3;
const BANDS = 8;
const TEXT_ROWS = 8;
const PING_PONG = 2;
const SINGLE = 1;
const NEXT = 1;
const FIRST_TICK = 0;
const UNITS = { dance: 0, history: 1, glyphs: 2 } as const;
const FIRST_INPUT_UNIT = 3;

type Frame = Readonly<{
  time: number;
  frame: number;
  pose: Float32Array;
  level: number;
  bands: Float32Array;
  beat: number;
  beatCount: number;
}>;

type Asset = "history" | "glyphs";

type Stage = Readonly<{ pass: Pass; program: WebGLProgram; buffers: readonly Buffer[] }>;

type Context = Readonly<{
  gl: Gl;
  size: Size;
  quad: WebGLBuffer;
  textures: Readonly<Record<keyof typeof UNITS, WebGLTexture>>;
  textWidths: Float32Array;
  stages: readonly Stage[];
  clock: { tick: number };
}>;

type Renderer = Readonly<{
  draw: Fn<Readonly<{ video: HTMLVideoElement; frame: Frame }>, void>;
  upload: Fn<Readonly<{ asset: Asset; source: TexImageSource }>, void>;
  setTextWidths: Fn<readonly number[], void>;
  dispose: () => void;
}>;

type UniformInput = Readonly<{ location: WebGLUniformLocation; texture: WebGLTexture }>;

type StageInput = Readonly<{ context: Context; stage: Stage; index: number; frame: Frame }>;

const buffersOf: Fn<Readonly<{ gl: Gl; pass: Pass; size: Size }>, readonly Buffer[]> = ({
  gl,
  pass,
  size,
}) => {
  if (Option.isNone(pass.target)) {
    return [];
  }
  if (pass.persistent) {
    return Arr.makeBy(PING_PONG, () => makeBuffer({ gl, size }));
  }
  return [makeBuffer({ gl, size })];
};

const writeBuffer: Fn<Readonly<{ stage: Stage; tick: number }>, Option.Option<Buffer>> = ({
  stage,
  tick,
}) => Arr.get(stage.buffers, tick % Math.max(stage.buffers.length, SINGLE));

const readBuffer: Fn<
  Readonly<{ stage: Stage; tick: number; previous: boolean }>,
  Option.Option<Buffer>
> = ({ stage, tick, previous }) => {
  if (stage.pass.persistent && previous) {
    return Arr.get(stage.buffers, (tick + NEXT) % PING_PONG);
  }
  return writeBuffer({ stage, tick });
};

const inputsOf: Fn<StageInput, readonly UniformInput[]> = ({
  context: { gl, stages, clock },
  stage: { program },
  index,
}) =>
  pipe(
    stages,
    Arr.flatMap((other, position) =>
      pipe(
        Option.all({
          name: other.pass.target,
          buffer: readBuffer({ stage: other, tick: clock.tick, previous: position >= index }),
        }),
        Option.flatMap(({ name, buffer }) =>
          pipe(
            Option.fromNullishOr(gl.getUniformLocation(program, name)),
            Option.map((location) => ({ location, texture: buffer.texture })),
          ),
        ),
        Option.toArray,
      ),
    ),
  );

const bindInputs: Fn<StageInput, void> = (input) => {
  const { gl } = input.context;
  for (const [offset, { location, texture }] of inputsOf(input).entries()) {
    const unit = FIRST_INPUT_UNIT + offset;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(location, unit);
  }
};

const setSamplers: Fn<StageInput, void> = ({
  context: { gl, size, textWidths },
  stage: { program },
}) => {
  gl.uniform1i(gl.getUniformLocation(program, "dance"), UNITS.dance);
  gl.uniform1i(gl.getUniformLocation(program, "history"), UNITS.history);
  gl.uniform1i(gl.getUniformLocation(program, "glyphs"), UNITS.glyphs);
  gl.uniform2f(gl.getUniformLocation(program, "resolution"), ...size);
  gl.uniform1fv(gl.getUniformLocation(program, "textWidth"), textWidths);
};

const setFrame: Fn<StageInput, void> = ({ context: { gl }, stage: { program }, frame }) => {
  gl.uniform1f(gl.getUniformLocation(program, "time"), frame.time);
  gl.uniform1f(gl.getUniformLocation(program, "frame"), frame.frame);
  gl.uniform3fv(gl.getUniformLocation(program, "pose"), frame.pose);
  gl.uniform1f(gl.getUniformLocation(program, "level"), frame.level);
  gl.uniform1fv(gl.getUniformLocation(program, "bands"), frame.bands);
  gl.uniform1f(gl.getUniformLocation(program, "beat"), frame.beat);
  gl.uniform1f(gl.getUniformLocation(program, "beatCount"), frame.beatCount);
};

const drawStage: Fn<StageInput, void> = (input) => {
  const { gl, size, clock } = input.context;
  const target = pipe(
    writeBuffer({ stage: input.stage, tick: clock.tick }),
    Option.map(({ framebuffer }) => framebuffer),
    Option.getOrNull,
  );
  gl.useProgram(input.stage.program);
  setSamplers(input);
  setFrame(input);
  bindInputs(input);
  gl.bindFramebuffer(gl.FRAMEBUFFER, target);
  gl.viewport(ORIGIN, ORIGIN, ...size);
  gl.drawArrays(gl.TRIANGLE_STRIP, ORIGIN, QUAD_VERTICES);
};

const bindTexture: Fn<Readonly<{ gl: Gl; unit: number; texture: WebGLTexture }>, void> = ({
  gl,
  unit,
  texture,
}) => {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
};

const bindTextures: Fn<Context, void> = ({ gl, textures }) => {
  bindTexture({ gl, unit: UNITS.dance, texture: textures.dance });
  bindTexture({ gl, unit: UNITS.history, texture: textures.history });
  bindTexture({ gl, unit: UNITS.glyphs, texture: textures.glyphs });
};

const upload: Fn<Readonly<{ context: Context; unit: number; source: TexImageSource }>, void> = ({
  context: { gl },
  unit,
  source,
}) => {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.texImage2D(gl.TEXTURE_2D, ORIGIN, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
};

const draw: Fn<Readonly<{ context: Context; video: HTMLVideoElement; frame: Frame }>, void> = ({
  context,
  video,
  frame,
}) => {
  bindTextures(context);
  upload({ context, unit: UNITS.dance, source: video });
  for (const [index, stage] of context.stages.entries()) {
    drawStage({ context, stage, index, frame });
  }
  context.clock.tick += NEXT;
};

const dispose: Fn<Context, void> = ({ gl, stages, textures, quad }) => {
  for (const { program, buffers } of stages) {
    gl.deleteProgram(program);
    for (const { framebuffer, texture } of buffers) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
    }
  }
  for (const texture of Rec.values(textures)) {
    gl.deleteTexture(texture);
  }
  gl.deleteBuffer(quad);
};

const contextFor: Fn<Readonly<{ canvas: HTMLCanvasElement; passes: readonly Pass[] }>, Context> = ({
  canvas,
  passes,
}) => {
  const gl = contextOf(canvas);
  const size: Size = [canvas.width, canvas.height];
  return {
    gl,
    size,
    quad: makeQuad(gl),
    textures: { dance: makeTexture(gl), history: makeTexture(gl), glyphs: makeTexture(gl) },
    textWidths: new Float32Array(TEXT_ROWS),
    stages: pipe(
      passes,
      Arr.map((pass) => ({
        pass,
        program: link({ gl, frag: pass.frag }),
        buffers: buffersOf({ gl, pass, size }),
      })),
    ),
    clock: { tick: FIRST_TICK },
  };
};

const createRenderer: Fn<
  Readonly<{ canvas: HTMLCanvasElement; passes: readonly Pass[] }>,
  Renderer
> = (input) => {
  const context = contextFor(input);
  return {
    draw: ({ video, frame }) => {
      draw({ context, video, frame });
    },
    upload: ({ asset, source }) => {
      bindTexture({ gl: context.gl, unit: UNITS[asset], texture: context.textures[asset] });
      upload({ context, unit: UNITS[asset], source });
    },
    setTextWidths: (widths) => {
      context.textWidths.set(Arr.take(widths, TEXT_ROWS));
    },
    dispose: () => {
      dispose(context);
    },
  };
};

const emptyPose = (): Float32Array => new Float32Array(POSE_POINTS * POSE_FIELDS);

const emptyBands = (): Float32Array => new Float32Array(BANDS);

export type { Asset, Frame, Renderer };
export { BANDS, createRenderer, emptyBands, emptyPose, POSE_FIELDS, POSE_POINTS, TEXT_ROWS };
