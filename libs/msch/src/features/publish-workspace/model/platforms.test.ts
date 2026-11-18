import { describe, expect, it } from "vite-plus/test";

import { environmentOf, goesToNpm, isVersioned, releaseName, tagOf } from "./manifest.ts";
import { buildsOf, checksOf, nativeFields, nativeFileOf, nativeTargetsOf } from "./platforms.ts";

describe("publish names", () => {
  it("names the tag and environment after the unscoped package name", () => {
    const manifest = { name: "@r_masseater/y8", version: "0.2.0" };
    expect([
      releaseName(manifest),
      tagOf({ directory: "libs/y8", ...manifest }),
      environmentOf(manifest),
    ]).toStrictEqual(["y8", "y8-v0.2.0", "y8-release"]);
  });

  it("tags the repository root with the bare version", () => {
    expect(tagOf({ directory: ".", name: "typescript-template", version: "1.2.0" })).toBe("v1.2.0");
  });

  it("publishes to npm unless private and releases only versioned workspaces", () => {
    expect([
      goesToNpm({}),
      goesToNpm({ private: true }),
      goesToNpm({ private: false }),
    ]).toStrictEqual([true, false, true]);
    expect([isVersioned({ version: "0.0.0" }), isVersioned({ version: "0.1.0" })]).toStrictEqual([
      false,
      true,
    ]);
  });
});

describe("publish platforms", () => {
  it("derives build and check runners from release tasks", () => {
    const tasks = ["release:windows", "release:linux", "release:check:linux", "release:publish"];
    expect(buildsOf(tasks)).toStrictEqual([
      { os: "linux", runner: "ubuntu-latest" },
      { os: "windows", runner: "windows-latest" },
    ]);
    expect(checksOf(tasks)).toStrictEqual([{ os: "linux", runner: "ubuntu-latest" }]);
  });

  it("maps native targets to runners and per-target package fields", () => {
    expect(nativeTargetsOf(["linux-x64-gnu", "win32-x64-msvc", "freebsd-x64"])).toStrictEqual([
      { target: "linux-x64-gnu", runner: "ubuntu-latest" },
      { target: "win32-x64-msvc", runner: "windows-latest" },
    ]);
    expect(
      nativeFields({
        name: "@r_masseater/y8",
        version: "1.0.0",
        binary: "y8",
        target: "linux-x64-gnu",
        archive: false,
      }),
    ).toStrictEqual({
      name: "@r_masseater/y8-linux-x64-gnu",
      version: "1.0.0",
      os: ["linux"],
      cpu: ["x64"],
      libc: ["glibc"],
      main: "y8.linux-x64-gnu.node",
      files: ["y8.linux-x64-gnu.node"],
    });
  });
});

describe("archived native packages", () => {
  it("publishes an archived native build as a whole package without an entry point", () => {
    const native = {
      name: "@r_masseater/tsrs-effect",
      version: "1.0.0",
      binary: "tsrs",
      target: "win32-x64-msvc",
      archive: true,
    };
    expect([nativeFileOf(native), nativeFields(native)]).toStrictEqual([
      "tsrs.win32-x64-msvc.tgz",
      {
        name: "@r_masseater/tsrs-effect-win32-x64-msvc",
        version: "1.0.0",
        os: ["win32"],
        cpu: ["x64"],
        preferUnplugged: true,
      },
    ]);
  });
});
