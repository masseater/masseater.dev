import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      verify: { command: [], dependsOn: ["cargo"] },
      "daily:items": { command: "node bin/items.ts", cache: false },
      daily: {
        command: [
          "cargo build --release --locked -p mosaic",
          "node bin/character.ts",
          "ALCHEMY_STAGE=$ITEM vp run --filter mosaic deploy:mosaic-files",
        ],
        cache: false,
      },
      "persist-migrate": { command: "node bin/persist-migrate.ts", cache: false },
      cargo: {
        command:
          "cargo fmt -p mosaic --check && cargo clippy -p mosaic --all-targets -- -D warnings && cargo test -p mosaic",
        cache: {
          input: [
            "Cargo.toml",
            "src/**",
            {
              pattern: "libs/mosaic/src/entities/character/model/characters.json",
              base: "workspace",
            },
            { pattern: "Cargo.lock", base: "workspace" },
            { pattern: "Cargo.toml", base: "workspace" },
            { pattern: "rust-toolchain.toml", base: "workspace" },
          ],
          output: [],
        },
      },
    },
  },
});
