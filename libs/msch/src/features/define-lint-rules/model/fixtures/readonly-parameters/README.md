# typescript-eslint test cases

`upstream.json` holds the test cases of `prefer-readonly-parameter-types` from [typescript-eslint](https://github.com/typescript-eslint/typescript-eslint/blob/5987e7c9768739cda34069ccd381be1d4e173119/packages/eslint-plugin/tests/rules/prefer-readonly-parameter-types.test.ts) v8.74.0 that apply to a rule with no options. They are licensed under the MIT license in [LICENSE](LICENSE), and are not included in the published package.

These cases are left out:

- cases that pass `allow`, `checkParameterProperties: false` or `treatMethodsAsReadonly: true`, because the rule has no options
- two cases that expect a report on a parameter with no type annotation, because the rule reads only annotated parameters
- two overload declarations without an implementation, because oxlint does not parse them
