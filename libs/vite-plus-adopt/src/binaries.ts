type Platform = "darwin-arm64" | "darwin-x64" | "linux-arm64" | "linux-x64" | "win32-x64";

type Archive = "tar.gz" | "zip";

interface BinaryAsset {
  readonly url: string;
  readonly sha256: string;
  readonly archive: Archive;
}

interface Binary {
  readonly name: string;
  readonly version: string;
  readonly assets: Readonly<Record<Platform, BinaryAsset>>;
}

const archiveOf = (file: string): Archive => {
  if (file.endsWith(".zip")) {
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

const BETTERLEAKS: Binary = {
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

const actionlintAsset = releaseAsset(
  "https://github.com/rhysd/actionlint/releases/download/v1.7.12",
);

const ACTIONLINT: Binary = {
  name: "actionlint",
  version: "1.7.12",
  assets: {
    "darwin-arm64": actionlintAsset(
      "actionlint_1.7.12_darwin_arm64.tar.gz",
      "aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f",
    ),
    "darwin-x64": actionlintAsset(
      "actionlint_1.7.12_darwin_amd64.tar.gz",
      "5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644",
    ),
    "linux-arm64": actionlintAsset(
      "actionlint_1.7.12_linux_arm64.tar.gz",
      "325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6",
    ),
    "linux-x64": actionlintAsset(
      "actionlint_1.7.12_linux_amd64.tar.gz",
      "8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8",
    ),
    "win32-x64": actionlintAsset(
      "actionlint_1.7.12_windows_amd64.zip",
      "6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9",
    ),
  },
};

const zizmorAsset = releaseAsset("https://github.com/zizmorcore/zizmor/releases/download/v1.32.0");

const ZIZMOR: Binary = {
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

const PLATFORMS: readonly Platform[] = [
  "darwin-arm64",
  "darwin-x64",
  "linux-arm64",
  "linux-x64",
  "win32-x64",
];

export { ACTIONLINT, BETTERLEAKS, PLATFORMS, ZIZMOR };
export type { Archive, Binary, BinaryAsset, Platform };
