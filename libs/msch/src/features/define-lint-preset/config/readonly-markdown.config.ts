export const markdownReadonlyAllow = [
  {
    from: "package" as const,
    package: "mdast",
    name: ["ListItem", "Root", "RootContent", "Table", "TableRow", "Yaml"],
  },
  {
    from: "package" as const,
    package: "@types/mdast",
    name: ["Code", "ListItem", "Nodes", "Table", "TableRow"],
  },
  { from: "package" as const, package: "@types/hast", name: ["Element", "Root", "RootContent"] },
  {
    from: "package" as const,
    package: "liquidjs",
    name: [
      "Context",
      "Emitter",
      "Liquid",
      "Parser",
      "TagToken",
      "Template",
      "Tokenizer",
      "TopLevelToken",
    ],
  },
];
