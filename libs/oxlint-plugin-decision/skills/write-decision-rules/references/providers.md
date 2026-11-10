# Custom providers

Read this when rules must ask a decision service other than OpenRouter. The built-in provider is `openrouter`, so `openrouter/<model>` needs no provider code.

## Define and register a provider

```js
// decision-plugin.mjs
import {
  createDecisionPlugin,
  defineDecisionRule,
  defineProvider,
} from "@r_masseater/oxlint-plugin-decision";

export default createDecisionPlugin({
  name: "team",
  model: "internal/v2",
  rules: [
    defineDecisionRule({
      id: "no-swallowed-catch",
      target: "function",
      question: "Does this function catch an error and neither handle nor rethrow it?",
      cutoff: 0.8,
    }),
  ],
  providers: [
    defineProvider({
      name: "internal",
      requiredEnv: ["INTERNAL_DECIDER_KEY"],
      decide: ({ request, timeoutMs, env }) => {
        const key = process.env[env.INTERNAL_DECIDER_KEY ?? "INTERNAL_DECIDER_KEY"];
        return { ok: true, response: callYourDecider(request, key, timeoutMs) };
      },
    }),
  ],
});
```

A model id `internal/v2` routes to the provider named `internal` and sends `model: "v2"` in the request. An id whose provider is not registered makes the plugin throw at load time.

`requiredEnv` lists the variables the provider needs. The plugin checks them before calling `decide`, after applying the `env` renames. When one is missing, it warns once and reports nothing for that model. In CI with `ci: "fail"`, it fails the run instead.

`env` in the `decide` input is the rename map from settings, not the values. Read `process.env[env[name] ?? name]` yourself.

## The `decide` contract

`decide` is synchronous because oxlint rules are. A provider that calls a network service must block on a worker thread. The built-in provider does that with [synckit](https://github.com/un-ts/synckit). Returning a Promise is not supported.

The input is `{ request, timeoutMs, env }`. `request` is an OpenRouter Decisions request with `model`, `state` and `questions`. `state` holds `snippets` keyed by match id and optional `contexts`. Each question is `{ type: "noul", instructions }` or `{ type: "choice", instructions, criteria }`.

The output is `{ ok: true, response }` with a Decisions response body, or `{ ok: false, reason }`. A failure is a warning (or a CI failure), never an exception. Do not throw from `decide`. Respect `timeoutMs`, which is the remaining per-file budget.

Optional `decideAll(inputs)` gets every model of one file for this provider at once. It returns one result per input, in the same order. Send them concurrently there. Without it, the plugin calls `decide` once per model, one after another. A result count that differs from the input count fails every input of that call.

To check the provider, run oxlint with `OXLINT_DECISION_EXPLAIN=1`. Each match should show your model id and a probability, not an `error` line.
