import { ShaderMount } from "@paper-design/shaders";
import { Array as Arr, Effect, Option, pipe } from "effect";
import { Base64 } from "effect/encoding";
import { describe, expect, it } from "vite-plus/test";

import { BACKDROP_STYLE_HASH } from "./backdrop-palette.ts";

const injectedStyle = (): string => {
  const parent = document.createElement("div");
  expect(() => new ShaderMount(parent, "", {})).toThrow("WebGL");
  return pipe(
    Arr.fromIterable(document.querySelectorAll("style[data-paper-shader]")),
    Arr.head,
    Option.match({ onNone: () => "", onSome: (style) => style.innerHTML }),
  );
};

const sha256 = (text: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))).pipe(
    Effect.map((digest) => `'sha256-${Base64.encode(new Uint8Array(digest))}'`),
  );

describe("BACKDROP_STYLE_HASH", () => {
  it("Paper Shaders が head に足す style の内容の sha256 と一致する", () =>
    Effect.runPromise(
      sha256(injectedStyle()).pipe(
        Effect.tap((hash) =>
          Effect.sync(() => {
            expect(BACKDROP_STYLE_HASH).toBe(hash);
          }),
        ),
      ),
    ));
});
