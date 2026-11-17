import { String as Str } from "effect";

export type Platform = "darwin-arm64" | "darwin-x64" | "linux-arm64" | "linux-x64" | "win32-x64";

export type Archive = "tar.gz" | "zip";

export interface BinaryAsset {
  readonly url: string;
  readonly sha256: string;
  readonly archive: Archive;
}

export interface Binary {
  readonly name: string;
  readonly version: string;
  readonly assets: Readonly<Record<Platform, BinaryAsset>>;
}

const archiveOf = (file: string): Archive => {
  if (Str.endsWith(".zip")(file)) {
    return "zip";
  }
  return "tar.gz";
};

const releaseAsset =
  (release: string) =>
  (file: string, sha256: string): BinaryAsset => ({
    url: `${release}/${file}`,
    sha256,
    archive: archiveOf(file),
  });

const betterleaksAsset = releaseAsset(
  "https://github.com/betterleaks/betterleaks/releases/download/v2.0.0-rc.7",
);

export const BETTERLEAKS: Binary = {
  name: "betterleaks",
  version: "2.0.0-rc.7",
  assets: {
    "darwin-arm64": betterleaksAsset(
      "betterleaks_2.0.0-rc.7_darwin_arm64.tar.gz",
      "d5052b4789752e3d9995c0b71a5b531aea747455ba4f8d1534c90b41e03f906c",
    ),
    "darwin-x64": betterleaksAsset(
      "betterleaks_2.0.0-rc.7_darwin_x64.tar.gz",
      "b3be0c6b4b91036a6d8b98e47642470a5a872d4bff08b8ee34348e9baf1e3434",
    ),
    "linux-arm64": betterleaksAsset(
      "betterleaks_2.0.0-rc.7_linux_arm64.tar.gz",
      "32fcd5a77d7c3c2d97cc615c5d70344d0c62b5a36f38568ce8ec72e62783acad",
    ),
    "linux-x64": betterleaksAsset(
      "betterleaks_2.0.0-rc.7_linux_x64.tar.gz",
      "230ef42dc3a0ee35e5148b7b4e9280224a412ef100cd4e74d3d6681d94e6ccb8",
    ),
    "win32-x64": betterleaksAsset(
      "betterleaks_2.0.0-rc.7_windows_x64.zip",
      "36db668ba12b55537a11cc45cd61565ab7f4f23ce606e0827206f49048a5183e",
    ),
  },
};

export const PLATFORMS: readonly Platform[] = [
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
  "win32-x64",
];
