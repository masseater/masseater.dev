import { describe, expect, test } from "vite-plus/test";

import { markdownPathspecs, y8Section } from "./section.ts";

describe("y8Section", () => {
  test("reads the y8 key of the Vite config", () => {
    expect(y8Section({ y8: { ignores: ["vendor/**"] }, test: {} })).toStrictEqual({
      plugins: {},
      rules: {},
      ignores: ["vendor/**"],
      overrides: [],
    });
  });

  test("takes the ignores of the configs the section extends", () => {
    const y8 = { extends: [{ ignores: ["vendor/**"] }], ignores: ["**/CHANGELOG.md"] };
    expect(y8Section({ y8 }).ignores).toStrictEqual(["vendor/**", "**/CHANGELOG.md"]);
  });

  test.each([[true], [{}], [{ y8: "on" }], ["y8"]])(
    "falls back to an empty section for %j",
    (config) => {
      expect(y8Section(config)).toStrictEqual({});
    },
  );
});

describe("markdownPathspecs", () => {
  test("lints every Markdown file and excludes the ignored globs", () => {
    expect(
      markdownPathspecs({ config: { ignores: ["vendor/**", "**/CHANGELOG.md"] } }),
    ).toStrictEqual(["*.md", ":(glob,exclude)vendor/**", ":(glob,exclude)**/CHANGELOG.md"]);
  });

  test("keeps the patterns given on the command line", () => {
    expect(markdownPathspecs({ config: {}, patterns: ["docs/a.md"] })).toStrictEqual(["docs/a.md"]);
  });
});
