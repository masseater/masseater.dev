import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { mcpToolLayer } from "./mcp-tool-layer.ts";

RuleTester.describe = (text, run): void => {
  describe(text, () => {
    run();
  });
};
RuleTester.it = (text, run): void => {
  it(text, () => {
    run();
  });
};

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } });

const REGISTER = 'server.registerTool("list_songs", {}, () => result);\n';
const ONE_ERROR = 1;

tester.run("mcp-tool-layer", mcpToolLayer, {
  valid: [
    { code: REGISTER, filename: "/repo/apps/a/src/features/list-songs/api/list-songs.server.ts" },
    { code: REGISTER, filename: "/repo/apps/a/src/shared/api/defined-tool.server.ts" },
    { code: REGISTER, filename: "/repo/apps/a/src/app/mcp/tools.search.test.ts" },
    { code: REGISTER, filename: "/repo/apps/a/bin/serve.ts" },
    { code: "registerTools(server);\n", filename: "/repo/apps/a/src/app/mcp/tools.ts" },
  ],
  invalid: [
    {
      code: REGISTER,
      filename: "/repo/apps/a/src/app/mcp/read-tools.server.ts",
      errors: ONE_ERROR,
    },
    {
      code: REGISTER,
      filename: "/repo/apps/a/src/entities/ledger/api/tool.server.ts",
      errors: ONE_ERROR,
    },
    {
      code: REGISTER,
      filename: String.raw`C:\repo\apps\a\src\pages\home\tools.ts`,
      errors: ONE_ERROR,
    },
  ],
});
