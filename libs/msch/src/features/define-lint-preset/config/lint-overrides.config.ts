const LOGPUSH = 'Property[key.name="logpush"]:not([value.value=false])';
const LOGPUSH_MESSAGE =
  "Worker には logpush: true を付ける。付けないと、その Worker のログが Logpush に流れない";

const CPU_LIMIT = 'Property[key.name="limits"]:has(Property[key.name="cpuMs"])';
const CPU_LIMIT_MESSAGE =
  "コードを動かす Worker には limits.cpuMs を付け、本番の CPU 時間の最大値をわずかに上回る値にする。付けないと、1 回の暴走が上限の CPU 時間まで請求される";

const UNATTRIBUTED_MODEL_CALL =
  "モデルの呼び出しは AI Gateway を通し、呼び出し元を metadata に載せる。載せないと、費用やエラーを後から呼び出し元で引けない";

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
      selector: `CallExpression[callee.object.name=/^(Workers|Website)$/] > ObjectExpression.arguments:has(Property[key.name="main"]):not(:has(${CPU_LIMIT}))`,
      message: CPU_LIMIT_MESSAGE,
    },
    {
      selector: `CallExpression[callee.object.name="Website"]:not([callee.property.name="StaticSite"]) > ObjectExpression.arguments:not(:has(${CPU_LIMIT}))`,
      message: CPU_LIMIT_MESSAGE,
    },
    {
      selector:
        'CallExpression[callee.property.name="run"][callee.object.property.name="AI"][arguments.length<3]',
      message: UNATTRIBUTED_MODEL_CALL,
    },
    {
      selector:
        'CallExpression[callee.name="runWorkersAi"] > ObjectExpression > Property[key.name="call"] > ArrowFunctionExpression[params.length=0]',
      message: UNATTRIBUTED_MODEL_CALL,
    },
    {
      selector:
        'CallExpression[callee.name="createAI"] > ObjectExpression.arguments:not(:has(Property[key.name="metadata"]))',
      message: UNATTRIBUTED_MODEL_CALL,
    },
    {
      selector:
        'ObjectExpression:has(Property[key.value="cf-aig-gateway-id"]):not(:has(Property[key.value="cf-aig-metadata"]))',
      message: UNATTRIBUTED_MODEL_CALL,
    },
    {
      selector:
        'CallExpression[callee.object.name="AI"][callee.property.name="Gateway"] > ObjectExpression.arguments:not(:has(Property[key.name="collectLogs"][value.value=true]))',
      message:
        "AI Gateway には collectLogs: true を付ける。付けないと、モデルの呼び出しが後から引けない",
    },
    {
      selector:
        'CallExpression[callee.object.name="AI"][callee.property.name="Gateway"] > ObjectExpression.arguments:not(:has(Property[key.name="spendLimits"] > ObjectExpression > Property[key.name="enabled"][value.value=true]))',
      message:
        "AI Gateway には spendLimits を enabled: true で付け、日ごとの費用の上限を掛ける。付けないと、従量課金のモデルの呼び出しが上限なく請求される",
    },
    {
      selector:
        'CallExpression[callee.object.name="AI"][callee.property.name="Gateway"] > ObjectExpression.arguments:not(:has(Property[key.name="cacheTtl"]))',
      message:
        "AI Gateway には cacheTtl を付け、同じ問いの答えをキャッシュする。付けないと、同じ問いにも毎回課金される",
    },
    {
      selector: 'MemberExpression[object.name="Rum"][property.name="Site"]',
      message:
        "Rum.Site は使わない。CI のトークンに Account Settings Write が要る。Cloudflare API でホストごとに一度サイトを作り、トークンを CF_BEACON_TOKEN に置く",
    },
  ];
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
  rules: {
    "eslint-js/no-restricted-syntax": ["error", ...cloudflareResourceSyntax, removalPolicySyntax],
  },
};

export const alchemyOverride: {
  files: string[];
  rules: Readonly<Record<string, ["error", ...unknown[]]>>;
} = {
  files: ["**/alchemy.run.ts"],
  rules: {
    "eslint-js/no-restricted-syntax": [
      "error",
      ...cloudflareResourceSyntax,
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

export const commandsOverride: {
  files: string[];
  rules: Readonly<Record<string, "off">>;
} = {
  files: ["bin/**"],
  rules: {
    "node/no-process-env": "off",
    "node/no-sync": "off",
    "effecttsgo/node-builtin-import": "off",
  },
};
