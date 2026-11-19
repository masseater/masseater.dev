# steiger checks

`steiger-checks.json` holds every call that steiger's own tests make to the steiger rules wism has a counterpart for, with the files the call read and what steiger reported. `src/app/steiger-checks.test.ts` runs wism's `fsd` preset on each one and compares the findings. `steiger-checks-known-failures.txt` lists the checks where wism differs on purpose, with the reason.

| steiger rule              | wism rule                     |
| ------------------------- | ----------------------------- |
| `forbidden-imports`       | `layer-import`, `cross-slice` |
| `no-higher-level-imports` | `layer-import`                |
| `no-cross-imports`        | `cross-slice`                 |
| `no-public-api-sidestep`  | `public-api`                  |
| `no-wildcard-exports`     | `wildcard-export`             |
| `typo-in-layer-name`      | `layer-name`                  |

The other steiger rules and ls-lint's naming rules have no counterpart in wism, so their tests are not ported.

The tests come from [feature-sliced/steiger](https://github.com/feature-sliced/steiger/tree/ebbb3fb979bfe56d53edb2f0a7bba6aaee90faa5) under the MIT license in `LICENSE`.

## Recording

Clone steiger at that commit, run `pnpm install`, and build the toolkit with `npx tsup` in `packages/toolkit`. Save this as `packages/steiger-plugin-fsd/src/_record.ts`:

```ts
import * as fs from "node:fs";

import { parse as parseNearestTsConfig } from "tsconfck";
import { expect } from "vitest";

const OUT = process.env.STEIGER_RECORD as string;

function walk(node: any, out: any) {
  if (node.type === "file") {
    let content: string | null = null;
    try {
      content = String(fs.readFileSync(node.path, "utf8"));
    } catch {
      content = null;
    }
    out.files.push({ path: node.path, content });
  } else {
    out.folders.push(node.path);
    for (const child of node.children) walk(child, out);
  }
}

export function record<T extends { name: string; check: (...args: any[]) => any }>(rule: T): T {
  return {
    ...rule,
    async check(this: unknown, root: any, options: unknown) {
      const { currentTestName, testPath } = expect.getState();
      const result = await rule.check.call(this, root, options);
      const tree = { root: root.path, files: [] as any[], folders: [] as string[] };
      walk(root, tree);
      let tsconfig: unknown = null;
      try {
        const parsed: any = await parseNearestTsConfig(root.children[0]?.path ?? root.path);
        tsconfig = parsed?.tsconfig ?? null;
      } catch {
        tsconfig = null;
      }
      const test = currentTestName ?? "";

      fs.appendFileSync(
        OUT,
        JSON.stringify({
          rule: rule.name,
          spec: (testPath ?? "").replace(/.*steiger-plugin-fsd\/src\//, ""),
          test,
          options: options ?? null,
          tree,
          tsconfig,
          diagnostics: result.diagnostics.map((d: any) => ({
            message: d.message,
            location: d.location,
          })),
        }) + "\n",
      );
      return result;
    },
  } as T;
}
```

In the `index.ts` of each rule in the table, import `record` from `../_record.js` and replace `export default <rule>` with `export default record(<rule>)`. Then run the rules' tests in `packages/steiger-plugin-fsd`:

```sh
STEIGER_RECORD=/tmp/steiger.jsonl npx vitest run src/forbidden-imports src/no-higher-level-imports src/no-cross-imports src/no-public-api-sidestep src/no-wildcard-exports src/typo-in-layer-name
```

Some synchronous tests fail because `record` makes `check` asynchronous; their calls are still recorded. Build the fixture with this script, `node build.mjs /tmp/steiger.jsonl steiger-checks.json`:

```js
import fs from "node:fs";
const [input, out] = process.argv.slice(2);
const records = fs
  .readFileSync(input, "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line));
const counts = {};
const relative = (root) => (path) => {
  const prefix = root === "/" ? "/" : `${root}/`;
  return path === root ? "" : path.startsWith(prefix) ? path.slice(prefix.length) : path;
};
const cases = records.map((record) => {
  const spec = record.spec.replace(/\/index\.spec\.ts$/, "").replace(/\.spec\.ts$/, "");
  counts[spec] = (counts[spec] ?? 0) + 1;
  const rel = relative(record.tree.root);
  const files = Object.fromEntries(
    record.tree.files.map((file) => [rel(file.path), file.content ?? ""]),
  );
  const folders = record.tree.folders.map(rel).filter((folder) => folder !== "");
  const options = record.tsconfig?.compilerOptions;
  const tsconfig = options?.paths
    ? {
        baseUrl: rel((options.baseUrl ?? record.tree.root).replace(/\/$/, "")),
        paths: Object.fromEntries(
          Object.entries(options.paths).map(([alias, targets]) => [
            alias,
            targets.map((target) => (target.startsWith("/") ? `./${rel(target)}` : target)),
          ]),
        ),
      }
    : null;
  return {
    id: `${spec}#${counts[spec]}`,
    rule: record.rule.replace(/^fsd\//, ""),
    test: record.test,
    files,
    folders,
    tsconfig,
    found: record.diagnostics.map((diagnostic) => ({
      message: diagnostic.message,
      path: rel(diagnostic.location.path),
    })),
  };
});
fs.writeFileSync(out, `${JSON.stringify(cases, null, 1)}\n`);
console.log("cases", cases.length);
```
