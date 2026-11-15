# @r_masseater/oxlint-plugin-decision

> [!WARNING]
> This package is experimental. Use at your own risk.

[Oxlint](https://oxc.rs/docs/guide/usage/linter.html) rules written in plain English, answered by models on [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/) or by decision models on [OpenRouter](https://openrouter.ai).

A rule is a question about a function, a call, a JSX element or a whole file. Each match is sent to one or more decision models with the question. The plugin reports an error when the answer the rule cares about clears its cutoff.

Decision models do not write text. They return a probability for a yes/no question, or pick one of the options you list. That makes them fast and cheap enough to run over a codebase. It is also why every rule here is a question with a fixed set of answers.

For ready-made rules, see [`@r_masseater/oxlint-plugin-decision-presets`](https://www.npmjs.com/package/@r_masseater/oxlint-plugin-decision-presets).

This is a fork of [oxlint-plugin-jev](https://github.com/wobsoriano/oxlint-plugin-jev) by [Robert Soriano](https://github.com/wobsoriano). It asks Cloudflare AI Gateway or the OpenRouter Decisions API.

## Install

```sh
npm i -D oxlint @r_masseater/oxlint-plugin-decision
export CLOUDFLARE_ACCOUNT_ID="..."
export CLOUDFLARE_API_TOKEN="..."   # an account API token with Workers AI Read
```

The default model runs on Workers AI through the account's AI Gateway, so it needs no other key. Without the two variables, the plugin warns once and reports nothing.

## Write your rules

The plugin ships no rules of its own. You write each rule with `defineDecisionRule` in a plugin file of your own and pass the rules to `createDecisionPlugin`. Then you load that file from `oxlint.config.ts`. For ready-made rules, use [`@r_masseater/oxlint-plugin-decision-presets`](https://www.npmjs.com/package/@r_masseater/oxlint-plugin-decision-presets).

```js
// decision-plugin.mjs
import { createDecisionPlugin, defineDecisionRule } from "@r_masseater/oxlint-plugin-decision";

export default createDecisionPlugin({
  name: "team",
  rules: [
    defineDecisionRule({
      id: "no-pii-in-logs",
      target: "call",
      question:
        "Does this call write personal data, such as an email or phone number, to a log or console?",
      cutoff: 0.8,
    }),
    defineDecisionRule({
      id: "name-matches-behavior",
      target: "function",
      question:
        "Does this function's name describe only reading or fetching data (for example get, find, load or fetch), while its body also writes, logs or sends something?",
      cutoff: 0.8,
      context: { scope: "enclosing", kind: "class" },
    }),
  ],
});
```

Each rule becomes an oxlint rule named `<plugin name>/<rule id>`. You turn rules on and set their severity one by one, like any other oxlint rule. The plugin name defaults to `decision`.

```ts
// oxlint.config.ts
import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: ["./decision-plugin.mjs"],
  rules: {
    "team/no-pii-in-logs": "error",
    "team/name-matches-behavior": "warn",
  },
});
```

The rules you turn on share one request per file and model, so turning on more rules does not add requests.

## License

MIT.
