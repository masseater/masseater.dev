import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { Array, Option, pipe } from "effect";
import type { UserConfig } from "vite-plus";
import { playwright } from "vite-plus/test/browser-playwright";

const FONTCONFIG_FILE = `${import.meta.dirname}/../fontconfig/fonts.conf`;
const ALLOWED_MISMATCHED_PIXELS = 0.002;
const CARGO_INPUTS = ["Cargo.lock", "Cargo.toml", "rust-toolchain.toml", ".cargo/**"] as const;

const browserTest = (viewport: Readonly<{ width: number; height: number }>): UserConfig => ({
  test: {
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { channel: "chrome", env: { FONTCONFIG_FILE } } }),
      instances: [{ browser: "chromium" }],
      viewport: { ...viewport },
      expect: {
        toMatchScreenshot: {
          comparatorName: "pixelmatch",
          comparatorOptions: { allowedMismatchedPixelRatio: ALLOWED_MISMATCHED_PIXELS },
        },
      },
    },
  },
});

const cargoCommand = (crate: string): string =>
  `cargo fmt -p ${crate} --check && cargo clippy -p ${crate} --all-targets --locked -- -D warnings && cargo test -p ${crate} --locked`;

const tauriAppConfig = ({
  crate,
  devPort,
  viewport,
  workspaceInputs,
}: Readonly<{
  crate: string;
  devPort: number;
  viewport: Option.Option<Readonly<{ width: number; height: number }>>;
  workspaceInputs: readonly string[];
}>): UserConfig => {
  const base: UserConfig = {
    run: {
      tasks: {
        cargo: {
          command: cargoCommand(crate),
          cache: {
            input: [
              "src-tauri/**",
              ...pipe(
                [...CARGO_INPUTS, ...workspaceInputs],
                Array.map((pattern) => ({ pattern, base: "workspace" as const })),
              ),
            ],
            output: [],
          },
        },
      },
    },
    resolve: { tsconfigPaths: true },
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

export { tauriAppConfig };
