export const removalPolicySyntax: Readonly<{ selector: string; message: string }> = {
  selector:
    'CallExpression[callee.object.name=/^(D1|R2)$/][callee.property.name=/^(Database|Bucket)$/]:not(CallExpression[callee.property.name="pipe"][arguments.0.callee.object.name="RemovalPolicy"] > MemberExpression.callee > CallExpression.object)',
  message:
    "D1 と R2 は作り直すと中身が消えるので、alchemy の RemovalPolicy.protect() を .pipe で付けて置き換えと削除を止める",
};

export const removalPolicyOverride: {
  files: string[];
  excludeFiles: string[];
  rules: Readonly<Record<string, ["error", ...unknown[]]>>;
} = {
  files: ["**/*.ts"],
  excludeFiles: ["**/*.test.ts"],
  rules: { "eslint-js/no-restricted-syntax": ["error", removalPolicySyntax] },
};

export const alchemyOverride: {
  files: string[];
  rules: Readonly<Record<string, ["error", ...unknown[]]>>;
} = {
  files: ["**/alchemy.run.ts"],
  rules: {
    "eslint-js/no-restricted-syntax": [
      "error",
      removalPolicySyntax,
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

export const scriptsOverride: {
  files: string[];
  rules: Readonly<Record<string, "off">>;
} = {
  files: ["scripts/**"],
  rules: {
    "node/no-process-env": "off",
    "node/no-sync": "off",
    "effecttsgo/node-builtin-import": "off",
  },
};
