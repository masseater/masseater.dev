import { lapse } from "lapse";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [lapse()],
  test: { environment: "happy-dom" },
});
