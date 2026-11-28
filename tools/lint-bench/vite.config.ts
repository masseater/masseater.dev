import type { ToolSections } from "@r_masseater/msch/vite";
import { lapse } from "lapse";
import { defineConfig } from "vite-plus";

const tools: ToolSections["tools"] = {
  "betterleaks/betterleaks": {
    version: "2.0.0-rc.14",
    assets: {
      "darwin-arm64": "betterleaks_{version}_darwin_arm64.tar.gz",
      "darwin-x64": "betterleaks_{version}_darwin_x64.tar.gz",
      "linux-arm64": "betterleaks_{version}_linux_arm64.tar.gz",
      "linux-x64": "betterleaks_{version}_linux_x64.tar.gz",
      "win32-x64": "betterleaks_{version}_windows_x64.zip",
    },
  },
  "boostsecurityio/poutine": {
    version: "1.1.6",
    assets: {
      "darwin-arm64": "poutine_Darwin_arm64.tar.gz",
      "darwin-x64": "poutine_Darwin_x86_64.tar.gz",
      "linux-arm64": "poutine_Linux_arm64.tar.gz",
      "linux-x64": "poutine_Linux_x86_64.tar.gz",
    },
  },
  "gh-intel/sisakulint": {
    version: "0.4.0",
    assets: {
      "darwin-arm64": "sisakulint_{version}_darwin_arm64.tar.gz",
      "darwin-x64": "sisakulint_{version}_darwin_amd64.tar.gz",
      "linux-arm64": "sisakulint_{version}_linux_arm64.tar.gz",
      "linux-x64": "sisakulint_{version}_linux_amd64.tar.gz",
    },
  },
  "gitleaks/gitleaks": {
    version: "8.30.1",
    assets: {
      "darwin-arm64": "gitleaks_{version}_darwin_arm64.tar.gz",
      "darwin-x64": "gitleaks_{version}_darwin_x64.tar.gz",
      "linux-arm64": "gitleaks_{version}_linux_arm64.tar.gz",
      "linux-x64": "gitleaks_{version}_linux_x64.tar.gz",
      "win32-x64": "gitleaks_{version}_windows_x64.zip",
    },
  },
  "mongodb/kingfisher": {
    version: "2.20.0",
    assets: {
      "darwin-arm64": "kingfisher-darwin-arm64.tgz",
      "darwin-x64": "kingfisher-darwin-x64.tgz",
      "linux-arm64": "kingfisher-linux-arm64.tgz",
      "linux-x64": "kingfisher-linux-x64.tgz",
      "win32-x64": "kingfisher-windows-x64.zip",
    },
  },
  "rhysd/actionlint": {
    version: "1.7.12",
    assets: {
      "darwin-arm64": "actionlint_{version}_darwin_arm64.tar.gz",
      "darwin-x64": "actionlint_{version}_darwin_amd64.tar.gz",
      "linux-arm64": "actionlint_{version}_linux_arm64.tar.gz",
      "linux-x64": "actionlint_{version}_linux_amd64.tar.gz",
      "win32-x64": "actionlint_{version}_windows_amd64.zip",
    },
  },
  "rvben/rumdl": {
    version: "0.3.6",
    assets: {
      "darwin-arm64": "rumdl-v{version}-aarch64-apple-darwin.tar.gz",
      "darwin-x64": "rumdl-v{version}-x86_64-apple-darwin.tar.gz",
      "linux-arm64": "rumdl-v{version}-aarch64-unknown-linux-gnu.tar.gz",
      "linux-x64": "rumdl-v{version}-x86_64-unknown-linux-gnu.tar.gz",
      "win32-x64": "rumdl-v{version}-x86_64-pc-windows-msvc.zip",
    },
  },
  "sharkdp/hyperfine": {
    version: "2.0.0",
    assets: {
      "darwin-arm64": "hyperfine-v{version}-aarch64-apple-darwin.tar.gz",
      "darwin-x64": "hyperfine-v{version}-x86_64-apple-darwin.tar.gz",
      "linux-arm64": "hyperfine-v{version}-aarch64-unknown-linux-gnu.tar.gz",
      "linux-x64": "hyperfine-v{version}-x86_64-unknown-linux-gnu.tar.gz",
      "win32-x64": "hyperfine-v{version}-x86_64-pc-windows-msvc.zip",
    },
  },
  "suzuki-shunsuke/ghalint": {
    version: "1.6.0",
    assets: {
      "darwin-arm64": "ghalint_{version}_darwin_arm64.tar.gz",
      "darwin-x64": "ghalint_{version}_darwin_amd64.tar.gz",
      "linux-arm64": "ghalint_{version}_linux_arm64.tar.gz",
      "linux-x64": "ghalint_{version}_linux_amd64.tar.gz",
      "win32-x64": "ghalint_{version}_windows_amd64.zip",
    },
  },
  "trufflesecurity/trufflehog": {
    version: "3.100.1",
    assets: {
      "darwin-arm64": "trufflehog_{version}_darwin_arm64.tar.gz",
      "darwin-x64": "trufflehog_{version}_darwin_amd64.tar.gz",
      "linux-arm64": "trufflehog_{version}_linux_arm64.tar.gz",
      "linux-x64": "trufflehog_{version}_linux_amd64.tar.gz",
      "win32-x64": "trufflehog_{version}_windows_amd64.tar.gz",
    },
  },
  "zizmorcore/zizmor": {
    version: "1.33.1",
    assets: {
      "darwin-arm64": "zizmor-aarch64-apple-darwin.tar.gz",
      "darwin-x64": "zizmor-x86_64-apple-darwin.tar.gz",
      "linux-arm64": "zizmor-aarch64-unknown-linux-gnu.tar.gz",
      "linux-x64": "zizmor-x86_64-unknown-linux-gnu.tar.gz",
      "win32-x64": "zizmor-x86_64-pc-windows-msvc.zip",
    },
  },
};

export default defineConfig({
  run: {
    tasks: {
      bench: { command: "vpa --prepare && node bin/lint-bench.ts", cache: false },
    },
  },
  plugins: [lapse()],
  test: {
    include: ["src/**/*.test.ts"],
  },
  tools,
});
