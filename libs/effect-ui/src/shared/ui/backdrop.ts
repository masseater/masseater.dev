import { Mount } from "@effect/ui";
import type { Html } from "@effect/ui/html";
import { backdropPalette } from "@masseater.dev/ui/backdrop-palette";
import {
  ShaderMount,
  defaultObjectSizing,
  getShaderColorFromString,
  meshGradientFragmentShader,
  ShaderFitOptions,
} from "@paper-design/shaders";
import { Array as Arr, Effect, Record as Rec, Stream, pipe } from "effect";

import type { HtmlElement } from "#/shared/lib/element-types.ts";

const COLORS = Rec.values(backdropPalette);

const MAX_PIXEL_COUNT = 230_400;

const SPEED = 0.2;

const FIRST_FRAME = 0;

const MIN_PIXEL_RATIO = 1;

const UNIFORMS = {
  u_colors: pipe(
    COLORS,
    Arr.map((color) => getShaderColorFromString(color)),
  ),
  u_colorsCount: COLORS.length,
  u_distortion: 0.85,
  u_swirl: 0.35,
  u_grainMixer: 0,
  u_grainOverlay: 0.06,
  u_fit: ShaderFitOptions[defaultObjectSizing.fit],
  u_rotation: defaultObjectSizing.rotation,
  u_scale: defaultObjectSizing.scale,
  u_offsetX: defaultObjectSizing.offsetX,
  u_offsetY: defaultObjectSizing.offsetY,
  u_originX: defaultObjectSizing.originX,
  u_originY: defaultObjectSizing.originY,
  u_worldWidth: defaultObjectSizing.worldWidth,
  u_worldHeight: defaultObjectSizing.worldHeight,
} as const;

const STILL_COLORS = {
  "--still-base": backdropPalette.base,
  "--still-sky": backdropPalette.sky,
  "--still-pink": backdropPalette.pink,
  "--still-amber": backdropPalette.amber,
  "--still-indigo": backdropPalette.indigo,
  "--still-mint": backdropPalette.mint,
} as const;

const MeshGradient = Mount.makeStream("MeshGradient", {}, (node: HTMLElement) =>
  Stream.unwrap(
    Effect.acquireRelease(
      Effect.sync(
        () =>
          new ShaderMount(
            node,
            meshGradientFragmentShader,
            UNIFORMS,
            {},
            SPEED,
            FIRST_FRAME,
            MIN_PIXEL_RATIO,
            MAX_PIXEL_COUNT,
          ),
      ),
      (shader) =>
        Effect.sync(() => {
          shader.dispose();
        }),
    ).pipe(Effect.as(Stream.never)),
  ),
);

const MESH_GRADIENT = MeshGradient();

/** @stability experimental */
export const Backdrop = <Msg>(html: Html.H<Msg>): HtmlElement<Msg, "div"> =>
  html.div
    .class("vt-backdrop pointer-events-none absolute inset-0 -z-10")
    .attr("aria-hidden", "true")
    .children(
      html.div
        .class("stage-backdrop stage-backdrop-still absolute")
        .style(STILL_COLORS)
        .children(html.div.class("size-full").onMount(MESH_GRADIENT)),
      html.div.class("stage-spotlight absolute top-0 left-0 rounded-full"),
    );
