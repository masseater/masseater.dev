import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      measure: {
        command: "web-vitals-flow",
        cache: false,
      },
      "deploy:production": {
        command: "web-vitals-flow https://masseater.dev/rpp-kit/",
        cache: false,
        dependsOn: ["rpp-kit-demo#deploy:production"],
      },
    },
  },
});
