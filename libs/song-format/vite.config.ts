import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      schema: "node bin/song-schema.ts",
    },
  },
});
