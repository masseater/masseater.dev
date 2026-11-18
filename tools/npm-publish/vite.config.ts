import { defineConfig } from "vite-plus";

export default defineConfig({
  run: {
    tasks: {
      "claim-npm-names": {
        command: 'GH_TOKEN="$ACTIONS_TOKEN" node bin/claim-names.ts',
        cache: false,
      },
    },
  },
});
