const alchemyOverride: {
  files: string[];
  rules: Readonly<Record<string, ["error", ...unknown[]]>>;
} = {
  files: ["**/alchemy.run.ts"],
  rules: {
    "eslint-js/no-restricted-syntax": [
      "error",
      {
        selector: 'CallExpression[callee.name="Stack"]:not([arguments.0.name="APP_NAME"])',
        message: "スタック名には app-name.ts の APP_NAME を渡す",
      },
      {
        selector:
          'Program:not(:has(YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
        message:
          "スタックの最後で app-name.ts の requireAppPrefix を yield* して、リソース名の prefix を検査する",
      },
      {
        selector:
          'CallExpression[callee.name="Stack"] > .arguments:nth-child(3):not(:has(FunctionExpression > BlockStatement > ExpressionStatement:nth-last-child(2) > YieldExpression[delegate=true] > Identifier.argument[name="requireAppPrefix"]))',
        message:
          "スタックの最後で app-name.ts の requireAppPrefix を yield* して、リソース名の prefix を検査する",
      },
    ],
  },
};

const scriptsOverride: {
  files: string[];
  rules: Readonly<Record<string, "off">>;
} = {
  files: ["scripts/**"],
  rules: {
    "import/no-nodejs-modules": "off",
    "node/no-process-env": "off",
    "node/no-sync": "off",
    "effecttsgo/node-builtin-import": "off",
  },
};

export { alchemyOverride, scriptsOverride };
