import { Array as Arr, Option, pipe } from "effect";

import type { Pass } from "#/features/dance-stage/model/effect";
import PRELUDE from "#/features/dance-stage/shaders/prelude.glsl?raw";
import VERTEX from "#/features/dance-stage/shaders/vertex.glsl?raw";

import type { Fn } from "./fn";

const LOW = -1;
const HIGH = 1;
const QUAD = new Float32Array([LOW, LOW, HIGH, LOW, LOW, HIGH, HIGH, HIGH]);
const QUAD_VERTICES = 4;
const CORNER = 0;
const CORNER_SIZE = 2;
const ORIGIN = 0;
const POSE_POINTS = 33;
const POSE_FIELDS = 3;
const PING_PONG = 2;
const SINGLE = 1;
const NEXT = 1;
const DANCE_UNIT = 0;
const FIRST_INPUT_UNIT = 1;
const LEVELS = 1;
const TRANSPARENT = 0;
const FIRST_TICK = 0;

type Gl = WebGL2RenderingContext;

type Size = readonly [number, number];

type Frame = Readonly<{ time: number; frame: number; pose: Float32Array }>;

type Buffer = Readonly<{ texture: WebGLTexture; framebuffer: WebGLFramebuffer }>;

type Stage = Readonly<{ pass: Pass; program: WebGLProgram; buffers: readonly Buffer[] }>;

type Context = Readonly<{
  gl: Gl;
  size: Size;
  quad: WebGLBuffer;
  dance: WebGLTexture;
  stages: readonly Stage[];
  clock: { tick: number };
}>;

type Renderer = Readonly<{
  draw: Fn<Readonly<{ video: HTMLVideoElement; frame: Frame }>, void>;
  dispose: () => void;
}>;

type UniformInput = Readonly<{ location: WebGLUniformLocation; texture: WebGLTexture }>;

const compile: Fn<Readonly<{ gl: Gl; type: GLenum; source: string }>, WebGLShader> = ({
  gl,
  type,
  source,
}) => {
  const shader = Option.getOrThrowWith(
    Option.fromNullishOr(gl.createShader(type)),
    () => new Error("shader を作れない"),
  );
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader のコンパイルに失敗");
  }
  return shader;
};

const link: Fn<Readonly<{ gl: Gl; frag: string }>, WebGLProgram> = ({ gl, frag }) => {
  const program = gl.createProgram();
  gl.attachShader(program, compile({ gl, type: gl.VERTEX_SHADER, source: VERTEX }));
  gl.attachShader(
    program,
    compile({ gl, type: gl.FRAGMENT_SHADER, source: `${PRELUDE}\n${frag}` }),
  );
  gl.bindAttribLocation(program, CORNER, "corner");
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program のリンクに失敗");
  }
  return program;
};

const makeTexture: Fn<Gl, WebGLTexture> = (gl) => {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};

const makeBuffer: Fn<Readonly<{ gl: Gl; size: Size }>, Buffer> = ({
  gl,
  size: [width, height],
}) => {
  const texture = makeTexture(gl);
  gl.texStorage2D(gl.TEXTURE_2D, LEVELS, gl.RGBA8, width, height);
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, ORIGIN);
  gl.clearColor(TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer };
};

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

const contextOf: Fn<HTMLCanvasElement, Gl> = (canvas) =>
  Option.getOrThrowWith(
    Option.fromNullishOr(canvas.getContext("webgl2", { premultipliedAlpha: false })),
    () => new Error("WebGL2 が使えない"),
  );

const makeQuad: Fn<Gl, WebGLBuffer> = (gl) => {
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(CORNER);
  gl.vertexAttribPointer(CORNER, CORNER_SIZE, gl.FLOAT, false, ORIGIN, ORIGIN);
  return quad;
};

const inputsOf: Fn<
  Readonly<{ context: Context; stage: Stage; index: number }>,
  readonly UniformInput[]
> = ({ context: { gl, stages, clock }, stage: { program }, index }) =>
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

const bindInputs: Fn<Readonly<{ context: Context; stage: Stage; index: number }>, void> = (
  input,
) => {
  const { gl } = input.context;
  for (const [offset, { location, texture }] of inputsOf(input).entries()) {
    const unit = FIRST_INPUT_UNIT + offset;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(location, unit);
  }
};

const setUniforms: Fn<Readonly<{ context: Context; stage: Stage; frame: Frame }>, void> = ({
  context: { gl, size },
  stage: { program },
  frame,
}) => {
  gl.uniform1i(gl.getUniformLocation(program, "dance"), DANCE_UNIT);
  gl.uniform2f(gl.getUniformLocation(program, "resolution"), ...size);
  gl.uniform1f(gl.getUniformLocation(program, "time"), frame.time);
  gl.uniform1f(gl.getUniformLocation(program, "frame"), frame.frame);
  gl.uniform3fv(gl.getUniformLocation(program, "pose"), frame.pose);
};

const drawStage: Fn<
  Readonly<{ context: Context; stage: Stage; index: number; frame: Frame }>,
  void
> = (input) => {
  const { gl, size, clock } = input.context;
  const target = pipe(
    writeBuffer({ stage: input.stage, tick: clock.tick }),
    Option.map(({ framebuffer }) => framebuffer),
    Option.getOrNull,
  );
  gl.useProgram(input.stage.program);
  setUniforms(input);
  bindInputs(input);
  gl.bindFramebuffer(gl.FRAMEBUFFER, target);
  gl.viewport(ORIGIN, ORIGIN, ...size);
  gl.drawArrays(gl.TRIANGLE_STRIP, ORIGIN, QUAD_VERTICES);
};

const draw: Fn<Readonly<{ context: Context; video: HTMLVideoElement; frame: Frame }>, void> = ({
  context,
  video,
  frame,
}) => {
  const { gl, dance, stages, clock } = context;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, dance);
  gl.texImage2D(gl.TEXTURE_2D, ORIGIN, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  for (const [index, stage] of stages.entries()) {
    drawStage({ context, stage, index, frame });
  }
  clock.tick += NEXT;
};

const dispose: Fn<Context, void> = ({ gl, stages, dance, quad }) => {
  for (const { program, buffers } of stages) {
    gl.deleteProgram(program);
    for (const { framebuffer, texture } of buffers) {
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
    }
  }
  gl.deleteTexture(dance);
  gl.deleteBuffer(quad);
};

const createRenderer: Fn<
  Readonly<{ canvas: HTMLCanvasElement; passes: readonly Pass[] }>,
  Renderer
> = ({ canvas, passes }) => {
  const gl = contextOf(canvas);
  const size: Size = [canvas.width, canvas.height];
  const context: Context = {
    gl,
    size,
    quad: makeQuad(gl),
    dance: makeTexture(gl),
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
  return {
    draw: ({ video, frame }) => {
      draw({ context, video, frame });
    },
    dispose: () => {
      dispose(context);
    },
  };
};

const emptyPose = (): Float32Array => new Float32Array(POSE_POINTS * POSE_FIELDS);

export type { Frame, Renderer };
export { createRenderer, emptyPose, POSE_FIELDS, POSE_POINTS };
