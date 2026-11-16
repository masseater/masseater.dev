import { browserTest } from "@masseater.dev/browser-test/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { Array, Option, pipe } from "effect";
import type { UserConfig } from "vite-plus";

const CARGO_INPUTS = ["Cargo.lock", "Cargo.toml", "rust-toolchain.toml", ".cargo/**"] as const;

const cargoCommand = (crate: string): string =>
  `cargo fmt -p ${crate} --check && cargo clippy -p ${crate} --all-targets --locked -- -D warnings && cargo test -p ${crate} --locked`;

export const tauriAppTasks = ({
  crate,
  workspaceInputs,
}: Readonly<{ crate: string; workspaceInputs: readonly string[] }>): NonNullable<
  NonNullable<UserConfig["run"]>["tasks"]
> => ({
  cargo: {
    command: cargoCommand(crate),
    cache: {
      input: [
        "src-tauri/**",
        "!src-tauri/gen/**",
        "!src-tauri/target/**",
        ...pipe(
          [...CARGO_INPUTS, ...workspaceInputs],
          Array.map((pattern) => ({ pattern, base: "workspace" as const })),
        ),
      ],
      output: [],
    },
  },
});

const WINDOWS_INSTALLER =
  "tauri build --config src-tauri/tauri.release.conf.json --bundles nsis && bundle-collect nsis";

export const tauriReleaseTasks = (
  component: string,
): NonNullable<NonNullable<UserConfig["run"]>["tasks"]> => ({
  "release:windows": { command: WINDOWS_INSTALLER, cache: false },
  "release:tag": { command: `component-tag ${component}`, cache: false },
  "release:publish": {
    command: `component-release ${component} ${component} release-assets`,
    cache: false,
  },
  "release:token": { command: `release-please-token ${component}`, cache: false },
});

export const tauriAppConfig = ({
  devPort,
  viewport,
}: Readonly<{
  devPort: number;
  viewport: Option.Option<Readonly<{ width: number; height: number }>>;
}>): UserConfig => {
  const base: UserConfig = {
    plugins: [tailwindcss(), viteReact()],
    clearScreen: false,
    server: { port: devPort, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  };
  return pipe(
    viewport,
    Option.match({
      onNone: () => base,
      onSome: (size) => ({ ...base, ...browserTest(size) }),
    }),
  );
};
