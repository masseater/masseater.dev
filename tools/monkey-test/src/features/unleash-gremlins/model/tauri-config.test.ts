import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { devServerOf } from "./tauri-config.ts";

describe("devServerOf", () => {
  it("reads the command and the URL of the frontend dev server", () => {
    expect(
      devServerOf({ build: { beforeDevCommand: "vp dev", devUrl: "http://localhost:1420" } }),
    ).toStrictEqual(Option.some({ command: "vp dev", url: "http://localhost:1420" }));
  });

  it("has no dev server when the config names none", () => {
    expect(devServerOf({ build: { devUrl: "http://localhost:1420" } })).toStrictEqual(
      Option.none(),
    );
    expect(devServerOf({})).toStrictEqual(Option.none());
  });
});
