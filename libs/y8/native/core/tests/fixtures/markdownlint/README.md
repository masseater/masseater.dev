# markdownlint fixtures

These come from markdownlint 0.42.2. `LICENSE` is its license (MIT).

- The `.md` files are markdownlint's `test/*.md` scenarios. `expected.json` holds, for each one, the errors in `test/markdownlint-test-scenarios.mjs.snapshot` as `[rule, line, detail, context, range]`.
- `lint-calls.json` holds every distinct call that markdownlint's own test suite makes to lint one document with the built-in rules only: the document, the config, whether inline config is on, and the errors markdownlint returned as `[rule, line, detail, context, range, severity]`. Calls that use custom rules are left out because y8 runs those through markdownlint itself. `unsupported` names options y8 does not have; those calls are not run. `lint-calls-known-failures.txt` lists the calls that do not match, with the reason.

`conformance.rs` checks both.

To record `lint-calls.json` again, in a markdownlint checkout of the new version run `npm install --ignore-scripts`, rename `lintContent` in `lib/markdownlint.mjs` to `lintContentOriginal`, add `import { appendFileSync as recordAppend } from "node:fs";` and append the wrapper below. Then run each test file with `MDL_TEST_FILE=<file name without .mjs> MDL_RECORD=/tmp/mdlrec/rec node --test test/<file>` and build the fixture with the Node program further below: `node build.mjs /tmp/mdlrec lint-calls.json`.

```js
function lintContent(ruleList, aliasToRuleNames, name, content, markdownItFactory, config, configParsers, frontMatterRe2, handleRuleFailures, noInlineConfig, synchronous, callback) {
  const record = process.env.MDL_RECORD;
  const wrapped = !record ? callback : (error, result) => {
    try {
      recordAppend(`${record}.${process.pid}`, JSON.stringify({
        test: process.env.MDL_TEST_FILE || "",
        name,
        content,
        config,
        noInlineConfig,
        custom: ruleList.length !== rules.length,
        frontMatter: frontMatterRe2 ? String(frontMatterRe2.toString()) : null,
        parsers: Boolean(configParsers),
        error: error ? String(error.message || error) : null,
        errors: result ? result.map((e) => [e.ruleNames[0], e.lineNumber, e.errorDetail, e.errorContext, e.errorRange, e.severity]) : null
      }) + "\n");
    } catch {}
    callback(error, result);
  };
  return lintContentOriginal(ruleList, aliasToRuleNames, name, content, markdownItFactory, config, configParsers, frontMatterRe2, handleRuleFailures, noInlineConfig, synchronous, wrapped);
}
```

```js
import fs from "node:fs";
import path from "node:path";
const [dir, out] = process.argv.slice(2);
const DEFAULT_FRONT_MATTER = /^\(\?m\)\(\(\^---/;
const seen = new Map();
for (const f of fs.readdirSync(dir).sort()) {
  for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
    if (!line) continue;
    const e = JSON.parse(line);
    if (e.custom || e.error) continue;
    const unsupported = [];
    if (e.parsers) unsupported.push("config parsers");
    if (e.frontMatter === null) unsupported.push("no front matter");
    else if (!DEFAULT_FRONT_MATTER.test(e.frontMatter)) unsupported.push("custom front matter");
    const key = JSON.stringify([e.content, e.config, e.noInlineConfig, unsupported]);
    if (seen.has(key)) continue;
    seen.set(key, { test: e.test, name: e.name, content: e.content, config: e.config ?? {}, inline: !e.noInlineConfig, unsupported, expect: e.errors });
  }
}
const counts = new Map();
const cases = [...seen.values()].map(({ test, ...rest }) => {
  const n = counts.get(test) ?? 0;
  counts.set(test, n + 1);
  return { id: `${test}#${n}`, ...rest };
});
const json = JSON.stringify(cases).replaceAll("\uFEFF", "\\uFEFF");
fs.writeFileSync(out, json + "\n");
console.log("cases", cases.length, "bytes", json.length, "unsupported", cases.filter((c) => c.unsupported.length).length);
```
