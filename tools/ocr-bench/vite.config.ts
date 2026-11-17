import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "invoice:render": { command: "node bin/invoice-render.ts", cache: false },
      "invoice:measure": { command: "node bin/invoice-measure.ts", cache: false },
      "invoice:rescore": { command: "node bin/invoice-rescore.ts", cache: false },
      "ja:prepare": { command: "node bin/ja-prepare.ts", cache: false },
      "ja:render": { command: "node bin/ja-render.ts", cache: false },
      "ja:measure": { command: "node bin/ja-measure.ts", cache: false },
      "ja:rescore": { command: "node bin/ja-rescore.ts", cache: false },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
