const lintToolReadonlyAllow = [
  {
    from: "package" as const,
    package: "@oxlint/plugins",
    name: [
      "Context",
      "Location",
      "Node",
      "Range",
      "Rule",
      "RuleMeta",
      "SourceCode",
      "VisitorWithHooks",
    ],
  },
  {
    from: "package" as const,
    package: "oxlint",
    name: ["InvalidTestCase", "Rule", "TestCases", "ValidTestCase"],
  },
  { from: "package" as const, package: "@commitlint/types", name: ["QualifiedConfig"] },
  {
    from: "package" as const,
    package: "@textlint/config-loader",
    name: ["TextlintLoadPackagesFromRawConfigResult"],
  },
  { from: "package" as const, package: "markdownlint", name: ["LintError"] },
  {
    from: "package" as const,
    package: "steiger",
    name: ["ConfigObject", "GlobalIgnore", "Plugin"],
  },
  {
    from: "file" as const,
    path: "upstream/attw-core/lib/checkPackage.d.ts",
    name: ["CheckPackageOptions"],
  },
  {
    from: "file" as const,
    path: "../vite-plus-adopt/dist/attw.d.mts",
    name: ["CheckPackageOptions"],
  },
  {
    from: "file" as const,
    path: "src/types.ts",
    name: ["CommitlintConfig", "MarkdownlintConfig", "TextlintConfig", "ToolSections"],
  },
  {
    from: "file" as const,
    name: [
      "BoundSymbol",
      "CompatSymbol",
      "CompatType",
      "FileBinding",
      "SymbolTable",
      "TypedContext",
    ],
  },
];

export { lintToolReadonlyAllow };
