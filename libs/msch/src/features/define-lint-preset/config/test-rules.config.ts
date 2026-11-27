import type { UserConfig } from "vite-plus";

type LintRules = NonNullable<NonNullable<UserConfig["lint"]>["rules"]>;

const NO_TEST_DOUBLES =
  "依存の振る舞いを差し替えない。Effect の Layer を差し替えるか、本物の実装を使う";

export const testRules = {
  "vitest/expect-expect": [
    "error",
    { assertFunctionNames: ["expect", "expect*", "assert*", "waitFor*", "run", "*.run"] },
  ],
  "vitest/valid-expect": ["error", { maxArgs: 2 }],
  "vitest/valid-title": ["error", { allowArguments: true }],
  "vitest/prefer-called-times": "off",
  "vitest/prefer-import-in-mock": "off",
  "vitest/no-standalone-expect": "off",
  "vitest/no-conditional-in-test": "off",
  "vitest/require-test-timeout": "off",
  "vitest/prefer-expect-assertions": "off",
  "vitest/require-top-level-describe": "off",
  "vitest/no-importing-vitest-globals": "off",
  "vitest/require-hook": "off",
  "vitest/no-hooks": "off",
  "vitest/consistent-test-it": "off",
  "vitest/prefer-describe-function-title": "off",
  "vitest/prefer-lowercase-title": "off",
  "vitest/prefer-to-be-truthy": "off",
  "vitest/prefer-to-be-falsy": "off",
  "vitest/padding-around-after-all-blocks": "off",
  "vitest/padding-around-test-blocks": "off",
  "vitest/max-expects": "off",
} satisfies LintRules;

const NO_FLAKE_MASKING =
  "再試行や flakyTest で不安定なテストを隠さない。待つ対象のイベントを await して直す";

export const testDoubleSyntax: readonly Readonly<{ selector: string; message: string }>[] = [
  {
    selector: 'CallExpression[callee.object.name="vi"][callee.property.name=/^(mock|doMock)$/]',
    message: NO_TEST_DOUBLES,
  },
  {
    selector: 'CallExpression[callee.object.name="vi"][callee.property.name="stubGlobal"]',
    message: NO_TEST_DOUBLES,
  },
];

export const flakeMaskingSyntax: readonly Readonly<{ selector: string; message: string }>[] = [
  { selector: 'Property[key.name="retry"]', message: NO_FLAKE_MASKING },
  { selector: 'MemberExpression[property.name="retry"]', message: NO_FLAKE_MASKING },
  { selector: 'MemberExpression[property.name="flakyTest"]', message: NO_FLAKE_MASKING },
];
