# Task: flag personal data written to logs

A team wants Oxlint to fail when code writes personal data to a log or console. Personal data means an email address or phone number, for example. A pattern-based rule can't tell `console.log(user.email)` from `console.log({ userId: id })`. So they want a plain-English rule answered by a decision model with `@r_masseater/oxlint-plugin-decision`.

Starting point: a project with `fail.js` (logs `user.email` and `user.phone`) and `pass.js` (logs only an id). Oxlint and the plugin are installed and `OPENROUTER_API_KEY` is set.

The task is done when `oxlint -c oxlint.config.ts` reports `fail.js` under a `team/<rule id>` diagnostic. It must report nothing for `pass.js`. The API key must not be written into the plugin file or the config. A rule that is defined but not turned on in `oxlint.config.ts` must send no request.

`tests/skill-write-decision-rules.test.ts` checks the expected solution and the mistakes the skill warns about. It runs them against a mock OpenRouter server.
