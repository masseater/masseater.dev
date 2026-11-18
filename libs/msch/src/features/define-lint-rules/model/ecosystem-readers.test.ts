import { RuleTester } from "vite-plus/lint/plugins-dev";
import { describe, it } from "vite-plus/test";

import { ecosystemReaders } from "./ecosystem-readers.ts";

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

const ONE_ERROR = 1;

const reported = (code: string): { readonly code: string; readonly errors: number } => ({
  code,
  errors: ONE_ERROR,
});

tester.run("ecosystem-readers", ecosystemReaders, {
  valid: [
    'import { readWorkspaceManifest } from "@pnpm/workspace.workspace-manifest-reader";\nconst file = "pnpm-workspace.yaml";\n',
    'import { parse } from "yaml";\nconst file = ".github/workflows/verify.yml";\n',
    'import { parse } from "smol-toml";\nconst file = "pnpm-workspace.yaml";\n',
    'import { parse } from "vite-plus";\nconst file = "vite.config.ts";\n',
    'const message = "Set cargo in pnpm-workspace.yaml.";\n',
  ],
  invalid: [
    reported('import { parse } from "yaml";\nconst file = "pnpm-workspace.yaml";\n'),
    reported(`import { parse } from "yaml";\nconst file = \`\${root}/pnpm-lock.yaml\`;\n`),
    reported('import { parse } from "smol-toml";\nconst file = "./Cargo.toml";\n'),
    reported('const file = "tsconfig.build.json";\nconst config = JSON.parse(text);\n'),
    reported('import ts from "typescript";\nconst file = "vite.config.ts";\n'),
  ],
});
