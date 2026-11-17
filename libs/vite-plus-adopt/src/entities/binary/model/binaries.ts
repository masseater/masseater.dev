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

const zizmorAsset = releaseAsset("https://github.com/zizmorcore/zizmor/releases/download/v1.32.0");

export const ZIZMOR: Binary = {
  name: "zizmor",
  version: "1.32.0",
  assets: {
    "darwin-arm64": zizmorAsset(
      "zizmor-aarch64-apple-darwin.tar.gz",
      "6efed18c4539a663fd3c851a2be9533fd8456c4e646d9416206da059154a0d3c",
    ),
    "darwin-x64": zizmorAsset(
      "zizmor-x86_64-apple-darwin.tar.gz",
      "6983143c719ada6845a69cc4dd2bacc215f971662fecd8bbd2678388e5ce5969",
    ),
    "linux-arm64": zizmorAsset(
      "zizmor-aarch64-unknown-linux-gnu.tar.gz",
      "cb152b207f815116d7fa1c1ee4614f61578803351395052908095e79adfd9fd0",
    ),
    "linux-x64": zizmorAsset(
      "zizmor-x86_64-unknown-linux-gnu.tar.gz",
      "bb110cc765eca9cd7efb2e284a956be5974c60027b0970f16397d86208a9957b",
    ),
    "win32-x64": zizmorAsset(
      "zizmor-x86_64-pc-windows-msvc.zip",
      "d284a16e09d9df4ce2c000357e7b59bd531be093bea5718a1ce225b449b59d49",
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
