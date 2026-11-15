const LOGPUSH = 'Property[key.name="logpush"][value.value=true]';
const LOGPUSH_MESSAGE =
  "Worker には logpush: true を付ける。付けないと、その Worker のログが Logpush に流れない";

export const cloudflareResourceSyntax: readonly Readonly<{ selector: string; message: string }>[] =
  [
    {
      selector: `CallExpression[callee.object.name="Workers"][callee.property.name="Worker"] > ObjectExpression.arguments:not(:has(${LOGPUSH}))`,
      message: LOGPUSH_MESSAGE,
    },
    {
      selector: `CallExpression[callee.object.name="Website"] > ObjectExpression.arguments:not(:has(${LOGPUSH}))`,
      message: LOGPUSH_MESSAGE,
    },
    {
      selector: 'MemberExpression[object.name="Rum"][property.name="Site"]',
      message:
        "Rum.Site は使わない。CI のトークンに Account Settings Write が要る。Cloudflare API でホストごとに一度サイトを作り、トークンを CF_BEACON_TOKEN に置く",
    },
  ];

export const alchemyOverride: {
  files: string[];
  rules: Readonly<Record<string, ["error", ...unknown[]]>>;
} = {
  files: ["**/alchemy.run.ts"],
  rules: {
    "eslint-js/no-restricted-syntax": [
      "error",
      ...cloudflareResourceSyntax,
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
