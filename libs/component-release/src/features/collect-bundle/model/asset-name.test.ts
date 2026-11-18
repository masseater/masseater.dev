import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { assetName } from "./asset-name.ts";

const release = { name: "yogoto", version: "0.1.0" };

describe("assetName", () => {
  it("replaces a product name GitHub would strip with the package name", () => {
    expect(assetName(release, "よごと_0.1.0_x64-setup.exe")).toStrictEqual(
      Option.some("yogoto_0.1.0_x64-setup.exe"),
    );
  });

  it("keeps the architecture and extension of every bundle kind", () => {
    expect(assetName(release, "yogoto_0.1.0_amd64.AppImage")).toStrictEqual(
      Option.some("yogoto_0.1.0_amd64.AppImage"),
    );
  });

  it("finds nothing when the file does not carry the version", () => {
    expect(assetName(release, "よごと_0.2.0_x64-setup.exe")).toStrictEqual(Option.none());
  });
});
