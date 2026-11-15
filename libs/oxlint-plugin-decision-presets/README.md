# @r_masseater/oxlint-plugin-decision-presets

> [!WARNING]
> This package is experimental. Use at your own risk.

Ready-made [Oxlint](https://oxc.rs/docs/guide/usage/linter.html) rules for [@r_masseater/oxlint-plugin-decision](https://www.npmjs.com/package/@r_masseater/oxlint-plugin-decision), answered through [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) or [OpenRouter](https://openrouter.ai).

Each preset is a list of plain-English questions about your code. The plugin asks a decision model each question for every match. It reports an error when the answer clears the rule's cutoff. Pick a preset to start linting without writing any rules. Add your own rules when you need them.

## Install

```sh
npm i -D oxlint @r_masseater/oxlint-plugin-decision @r_masseater/oxlint-plugin-decision-presets
export CLOUDFLARE_ACCOUNT_ID="..."
export CLOUDFLARE_API_TOKEN="..."   # an account API token with Workers AI Read
```

The plugin reads the account and the token from `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. Without them, the plugin warns once and reports nothing.

## Use a preset

Point `jsPlugins` at a preset and turn on its rules. Each rule is its own oxlint rule, named `decision-presets/<id>`, so you choose which ones run and at what severity. Settings such as `model`, `ci` and `timeoutMs` go under `settings["decision-presets"]` and apply to every rule of the preset.

```ts
// oxlint.config.ts
import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: ["@r_masseater/oxlint-plugin-decision-presets/recommended"],
  rules: {
    "decision-presets/no-pii-in-logs": "error",
    "decision-presets/no-prompt-injection": "error",
    "decision-presets/no-hardcoded-secrets": "error",
  },
});
```

A preset decides which rules the plugin registers. A rule turns on only when you list it under `rules`.

| Preset        | Import path                                               | Rule prefix         | What it is for                                                                                             | Run it as                            |
| ------------- | --------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `recommended` | `@r_masseater/oxlint-plugin-decision-presets/recommended` | `decision-presets/` | Security problems that should never ship: personal data in logs, prompt injection, hard-coded secrets.     | `"error"`                            |
| `strict`      | `@r_masseater/oxlint-plugin-decision-presets/strict`      | `decision-presets/` | `recommended` plus code that breaks a promise its name makes, hidden failures, and tests that cannot fail. | `"error"`                            |
| `review-only` | `@r_masseater/oxlint-plugin-decision-presets/review-only` | `decision-presets/` | Judgment calls worth a look in review, mostly text that misdescribes the code next to it.                  | `"warn"`                             |
| `ai-slop`     | `@r_masseater/oxlint-plugin-decision-presets/ai-slop`     | `decision-ai-slop/` | Padding that coding agents tend to leave behind.                                                           | `"warn"`, `"error"` for placeholders |

The package root (`@r_masseater/oxlint-plugin-decision-presets`) is the `recommended` preset.

## Credits

The rules that check a claim the code makes about itself are adapted from [jev-lint](https://github.com/mizchi/jev-lint) by mizchi.

## License

MIT.
