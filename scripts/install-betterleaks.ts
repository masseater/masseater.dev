import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const VERSION = "2.0.0-rc.7";
const STATUS_SUCCESS = 0;
const EXECUTABLE_MODE = 0o755;

const ASSETS: Record<string, readonly [string, string]> = {
  "darwin-arm64": [
    "betterleaks_2.0.0-rc.7_darwin_arm64.tar.gz",
    "d5052b4789752e3d9995c0b71a5b531aea747455ba4f8d1534c90b41e03f906c",
  ],
  "darwin-x64": [
    "betterleaks_2.0.0-rc.7_darwin_x64.tar.gz",
    "b3be0c6b4b91036a6d8b98e47642470a5a872d4bff08b8ee34348e9baf1e3434",
  ],
  "linux-arm64": [
    "betterleaks_2.0.0-rc.7_linux_arm64.tar.gz",
    "32fcd5a77d7c3c2d97cc615c5d70344d0c62b5a36f38568ce8ec72e62783acad",
  ],
  "linux-x64": [
    "betterleaks_2.0.0-rc.7_linux_x64.tar.gz",
    "230ef42dc3a0ee35e5148b7b4e9280224a412ef100cd4e74d3d6681d94e6ccb8",
  ],
  "win32-arm64": [
    "betterleaks_2.0.0-rc.7_windows_arm64.zip",
    "247c0c46cecd89661bfc3c063f492de067423288370d95c0a53a4faa591e75aa",
  ],
  "win32-x64": [
    "betterleaks_2.0.0-rc.7_windows_x64.zip",
    "36db668ba12b55537a11cc45cd61565ab7f4f23ce606e0827206f49048a5183e",
  ],
};

const isWindows = process.platform === "win32";
let binaryName = "betterleaks";
if (isWindows) {
  binaryName = "betterleaks.exe";
}
const binDir = path.join(import.meta.dirname, "..", ".tooling", "bin");
const binary = path.join(binDir, binaryName);
const stamp = path.join(binDir, ".betterleaks-version");

const fail = (message: string): never => {
  throw new Error(message);
};

const isInstalled = (): boolean =>
  existsSync(binary) && existsSync(stamp) && readFileSync(stamp, "utf8").trim() === VERSION;

const download = (url: string, dest: string): void => {
  const result = spawnSync("curl", ["-fsSL", url, "-o", dest], { stdio: "inherit" });
  if (result.status !== STATUS_SUCCESS) {
    fail(`betterleaks: download failed ${url}`);
  }
};

const verifyChecksum = (archive: string, sha256: string, file: string): void => {
  const digest = createHash("sha256").update(readFileSync(archive)).digest("hex");
  if (digest !== sha256) {
    fail(`betterleaks: checksum mismatch for ${file}`);
  }
};

const extractZip = (archive: string, extracted: string): void => {
  const result = spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Expand-Archive -LiteralPath '${archive}' -DestinationPath '${extracted}' -Force`,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== STATUS_SUCCESS) {
    throw new Error("Expand-Archive failed");
  }
};

const extractTar = (archive: string, extracted: string): void => {
  const result = spawnSync("tar", ["-xf", archive, "-C", extracted], { stdio: "inherit" });
  if (result.status !== STATUS_SUCCESS) {
    throw new Error("tar extraction failed");
  }
};

const extractArchive = (file: string, archive: string, extracted: string): void => {
  if (file.endsWith(".zip") && isWindows) {
    extractZip(archive, extracted);
    return;
  }
  extractTar(archive, extracted);
};

const placeBinary = (extracted: string): void => {
  mkdirSync(binDir, { recursive: true });
  copyFileSync(path.join(extracted, binaryName), binary);
  if (!isWindows) {
    chmodSync(binary, EXECUTABLE_MODE);
  }
  writeFileSync(stamp, `${VERSION}\n`);
};

const resolveAsset = (): readonly [string, string] => {
  const asset = ASSETS[`${process.platform}-${process.arch}`];
  if (asset) {
    return asset;
  }
  return fail(`betterleaks: unsupported platform ${process.platform}-${process.arch}`);
};

const unpack = (
  args: Readonly<{ work: string; file: string; sha256: string; url: string }>,
): void => {
  const archive = path.join(args.work, args.file);
  download(args.url, archive);
  verifyChecksum(archive, args.sha256, args.file);
  const extracted = path.join(args.work, "extracted");
  mkdirSync(extracted);
  extractArchive(args.file, archive, extracted);
  placeBinary(extracted);
};

const install = (): void => {
  const [file, sha256] = resolveAsset();
  const url = `https://github.com/betterleaks/betterleaks/releases/download/v${VERSION}/${file}`;
  const work = mkdtempSync(path.join(tmpdir(), "betterleaks-"));
  try {
    unpack({ work, file, sha256, url });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
};

if (!isInstalled()) {
  install();
}
