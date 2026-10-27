import { Option } from "effect";

import PRELUDE from "#/features/dance-stage/shaders/prelude.glsl?raw";
import VERTEX from "#/features/dance-stage/shaders/vertex.glsl?raw";

import type { Fn } from "./fn";

const LOW = -1;
const HIGH = 1;
const QUAD = new Float32Array([LOW, LOW, HIGH, LOW, LOW, HIGH, HIGH, HIGH]);
const CORNER = 0;
const CORNER_SIZE = 2;
const ORIGIN = 0;
const LEVELS = 1;
const TRANSPARENT = 0;

type Gl = WebGL2RenderingContext;

type Size = readonly [number, number];

type Buffer = Readonly<{ texture: WebGLTexture; framebuffer: WebGLFramebuffer }>;

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

export type { Buffer, Gl, Size };
export { contextOf, link, makeBuffer, makeQuad, makeTexture };
