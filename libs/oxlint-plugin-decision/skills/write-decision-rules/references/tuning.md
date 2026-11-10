# Tuning rules

Read this when a rule reports too much or too little, or before switching a rule to another model.

## See why each match was or wasn't reported

```sh
OXLINT_DECISION_EXPLAIN=1 npx oxlint      # readable text on stderr
OXLINT_DECISION_EXPLAIN=json npx oxlint   # one JSON object per match
```

oxlint does not pass flags to plugins, so explain mode is an environment variable. Settings also take `explain: true` or `"json"`, and the variable wins. `OXLINT_DECISION_EXPLAIN=0` turns it off. Each record shows the file and position, the rule, and the requested and served model. It also shows whether the answer was cached and the start of the source sent. Then come every question exactly as sent with its probability, the verdict and the cutoff. A failed request shows its reason instead. Explain mode only prints. It changes nothing that is asked, cached or reported.

## Adjust the question before the cutoff

Write one file that must fail and one that must pass, close to each other. For example, use the same body with a different name. Run explain mode on both. If the yes probabilities overlap, the question is ambiguous. Reword it to name exactly what counts and what doesn't. Changing only the cutoff cannot separate overlapping cases. When the two separate, set `cutoff` between them. Then the failing file is reported and the passing file is not.

A changed question, snippet, context, or answer kind re-asks that file. A changed `cutoff` or `id` reuses the cache, so cutoff tuning is free after the first run.

## Switching or mixing models

Probabilities are not calibrated the same across models. Re-tune cutoffs after switching, and pin a versioned model id once tuned.

`openrouter/respan/span-01-lite` is free and a cheap way to try rules. Respan models answer yes/no only. The plugin splits `classify` into one yes/no per label, and the highest yes wins. It splits `severity` into "at least info/warn/error", and the most serious level at 0.8 or above wins. It also asks about one match per request.

You can override one rule's model in `oxlint.config.ts` without touching the plugin file. For example, write `"team/stale-comment": ["warn", { model: "openrouter/~typesafe/jev-latest" }]`. Rules on different models are asked in separate requests and cached separately.

## Cache

Answers are cached under `node_modules/.cache/oxlint-plugin-decision`, keyed by endpoint and request. Unchanged code is not asked again. Persist that directory between CI runs to keep it warm. Malformed answers are never cached.
