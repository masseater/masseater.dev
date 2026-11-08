const WRITE_THROUGH_WRITER =
  "watashi-mcp の表は *-writer.server.ts の書き込み部品だけが書く。今の表の更新とリビジョンの追加を同じ batch に入れるため";

const writerOnlyOverride: {
  files: string[];
  excludeFiles: string[];
  rules: Readonly<Record<string, ["error", ...unknown[]]>>;
} = {
  files: ["apps/watashi-mcp/src/**/*.{ts,tsx}"],
  excludeFiles: ["apps/watashi-mcp/src/features/mcp/api/*-writer.server.ts"],
  rules: {
    "eslint/no-restricted-properties": [
      "error",
      { object: "db", property: "insert", message: WRITE_THROUGH_WRITER },
      { object: "db", property: "update", message: WRITE_THROUGH_WRITER },
      { object: "db", property: "delete", message: WRITE_THROUGH_WRITER },
      { object: "db", property: "batch", message: WRITE_THROUGH_WRITER },
      { object: "db", property: "run", message: WRITE_THROUGH_WRITER },
    ],
  },
};

export { writerOnlyOverride };
