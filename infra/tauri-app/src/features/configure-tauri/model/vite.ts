import { browserTest } from "@masseater.dev/browser-test/vite";
import type { CargoInput } from "@r_masseater/msch/cargo-inputs";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { Option, pipe } from "effect";
import type { UserConfig } from "vite-plus";

const GENERATED = ["!src-tauri/gen/**", "!src-tauri/target/**", "!src-tauri/permissions/**"];

const cargoCommand = (crate: string): string =>
  `cargo fmt -p ${crate} --check && cargo clippy -p ${crate} --all-targets --locked -- -D warnings && cargo test -p ${crate} --locked`;

export const tauriAppTasks = ({
  crate,
  input,
}: Readonly<{ crate: string; input: readonly CargoInput[] }>): NonNullable<
  NonNullable<UserConfig["run"]>["tasks"]
> => ({
  cargo: { command: cargoCommand(crate), cache: { input: [...input, ...GENERATED], output: [] } },
});

const WINDOWS_INSTALLER =
  "tauri build --config src-tauri/tauri.release.conf.json --bundles nsis && bundle-collect nsis";

export const tauriReleaseTasks = (): NonNullable<NonNullable<UserConfig["run"]>["tasks"]> => ({
  "release:windows": { command: WINDOWS_INSTALLER, cache: false },
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
