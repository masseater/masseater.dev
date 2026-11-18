---
title: "What is in typescript-template (as of October 24, 2026)"
description: "The structure and mechanisms of typescript-template v0.0.10, a GitHub template for TypeScript apps that run on Cloudflare."
tags: ["TypeScript", "Cloudflare", "Claude Code"]
published: true
---

I publish a GitHub template, [typescript-template](https://github.com/masseater/typescript-template). It is for starting a TypeScript web app that runs on Cloudflare from a state where checks, CI, deploys and the rules for working with AI agents are already in place. I made it to get rid of the work of rebuilding lint, CI and deploys every time I create a new repository. [The app as it comes from the template](https://typescript-template-web-production-ntesuocc46gilfjl.masseater.workers.dev) is also running.

This template is built on the premise that the ones writing code are mainly AI agents. What people decide is what to use, what to ban and what to check. I introduce, in order, what is in it and how each part works. The contents are those of v0.0.10 as of October 24, 2026.

## The structure of the app

| Role                                | What it uses                        |
| ----------------------------------- | ----------------------------------- |
| Screens                             | TanStack Start                      |
| API                                 | Elysia                              |
| Database                            | Cloudflare D1, handled with Drizzle |
| Authentication                      | better-auth                         |
| UI                                  | shadcn/ui                           |
| UI state                            | effect-atom                         |
| Server state                        | TanStack Query                      |
| Validation, dates, logs and tracing | Effect                              |

The API is written in Elysia. `src/app/routes/api.$.ts` passes `/api/*` to the Elysia router, and each slice adds its own routes there. On the client side, TanStack Query queries are built from the types of Eden, Elysia's client, so there is no place where API types are copied by hand. During SSR, `createIsomorphicFn` calls the route's `handle` directly, so the app does not make HTTP round trips to itself[^structure].

```ts
const client = createIsomorphicFn()
  .server(() => serverClient<TodoRoutes>(loadTodoRoutes))
  .client(() => browserClient<TodoRoutes>());

const todoQueries = createQueries<TodoRoutes>(client());
```

`serverClient` passes its own `fetcher` to Eden's `treaty`, and hands the `Request` it receives directly to the Elysia app's `handle`. `browserClient` points the same `treaty` at its own origin. Both take their types from `TodoRoutes`, so the arguments and return values of queries follow when the route definitions change.

The D1 schema is written in `*.table.ts`, and migrations are generated with `vp run db:generate`. better-auth's tables are also generated with `vp run auth:generate` and not written by hand. UI state and server state are split into separate libraries, so there is no ambiguity about which one holds a value. Validation, dates, logs and tracing are brought together in Effect, and no separate library is added for each purpose. The inside of the app is cut with Feature-Sliced Design, and code is placed near where it is used and not extracted until it is reused.

## Infrastructure

Cloudflare resources are defined as code with [Alchemy](https://alchemy.run), and wrangler is not used. `alchemy.run.ts` defines D1 and the Worker, and they are deployed with `vp exec alchemy deploy --stage production`. All resource names are built from `APP_NAME` in `src/app/app-name.ts`, and a test confirms that no other names get mixed in[^alchemy].

The production Worker comes with protection and recording from the start. In repositories that have the zone of a custom domain, WAF custom rules are generated from a list of typical paths that vulnerability scanners probe. The generated expression looks like this.

```text
(lower(http.request.uri.path) contains "/wp-admin" or ...) and not <ハニーポットのパス>
```

The paths left as honeypots are not blocked but received by a dedicated Worker. This Worker only writes one row with the path, source IP, country, ASN and User-Agent to Analytics Engine and returns 404, so you can later tally where things were probed from and what was probed. Every Worker has `logpush: true` so its logs are kept outside[^edge-guard]. The Workers Paid plan is assumed.

## Checks

All checks run with one command, `vp run verify`. verify is a task in `vite.config.ts` that first runs the checks listed in `dependsOn`, and runs `vp check` last.

```ts
verify: {
  command: "vp check",
  dependsOn: ["test-all", "eslint", "syncpack", "markdown-lint", "renovate",
              "actions-lint", "steiger-all", "db-check-all", "fallow-all", "audit"],
},
```

What goes in here are type checking and lint, tests, matching dependency versions, prose checks on Markdown, and validation of the Renovate settings[^verify]. Then come checks of the GitHub Actions workflows themselves, structural checks for Feature-Sliced Design, and checks that the Drizzle schema matches the migrations. Detection of dead code and unused dependencies and auditing of vulnerable dependencies are also here. `vp run` caches based on input files and environment variables, so checks with no changes are not run again. The prose checks on Markdown include rules for Japanese technical documents and rules that detect expressions common in text written by AI.

The lint policies are as in the following table.

| Policy                                                          | Mechanism                                                                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Put in all the official rules of the libraries in use as errors | Load ESLint plugins through oxlint's JS plugin mechanism, list each plugin's `rules`, and make them all `error`                                                                            |
| Ban imports of libraries that were not adopted                  | Generate the `no-restricted-imports` settings from a table mapping "reason → package names banned instead." Importing one is a violation on the spot, and the reason is shown[^restricted] |
| Have an LLM judge rules that cannot be decided from the AST     | My own [oxlint-plugin-decision](https://www.npmjs.com/package/@r_masseater/oxlint-plugin-decision) asks an LLM for a judgment per file[^decision]                                          |

The first is done with a function that just lists the keys of a plugin's `rules` object.

```ts
const allRulesOf = (prefix: string, plugin: Readonly<{ rules: object }>): Rules =>
  asErrors(Object.keys(plugin.rules).map((rule) => `${prefix}/${rule}`));

rules: {
  ...allRulesOf("tanstack-query", tanstackQuery),
  ...allRulesOf("tanstack-router", tanstackRouter),
  ...allRulesOf("shadcn", shadcn),
},
```

Rather than copying the recommended list, it enables every rule the plugin has, so rules added in plugin updates come in automatically. oxlint's own categories are set to `error` all the way through nursery, and `denyWarnings` leaves not a single warning.

The table for the second looks like this, for example.

```ts
const requiredStack = {
  "検証、日時、ログ、関数型ユーティリティは Effect だけで扱う": ["zod", "dayjs", "lodash", "fp-ts", ...],
  "UI 状態は effect-atom だけで扱う": ["zustand", "jotai", "redux", ...],
};
```

From this table, `paths` and `patterns` are built and passed to ESLint's `no-restricted-imports`. When an agent imports zod, the reason 「Effect だけで扱う」 comes back as the lint message. This stops it more reliably than writing 「zod は使わない」 in CLAUDE.md.

The third, LLM judgment, runs as an oxlint JS plugin. A rule is defined by a yes/no question in English, a message for violations and a confidence threshold.

```ts
defineDecisionRule({
  id: "exclusive-status",
  target: "file",
  question:
    "Does this code represent one piece of state with several boolean flags ... instead of one exclusive status expressed as a discriminated union? ...",
  message: "状態は排他的なstatusを持つ判別共用体で表し、booleanフラグの組を使わない。",
  cutoff: 0.8,
});
```

The question is sent for each file to a model through OpenRouter, and it is a violation only when the confidence exceeds the threshold. Judgment results are cached with the file contents as the key and carried over in CI with `actions/cache` too, so the same question is not sent again for files with no changes. When an LLM takes on lint, there is the worry that its judgments may waver. So I decided that only what it is confident about counts as a violation, and not to lower the threshold to catch what it misses. Before turning something into a rule, I check whether it can be judged with violating and non-violating examples whose answers are known.

Comments in code are banned with `eslint-plugin-no-comments`, and the only thing allowed is lint disable directives. Even those disable directives become errors through `reportUnusedDisableDirectives` once they are no longer needed. The "why" goes in commit messages[^docs]. As an extension of the policy of not writing what you can tell by reading the code, this reduces the places where explanations go stale.

## CI and deploys

There is no CI per PR. When main is pushed, the verify workflow runs, and if it passes, it deploys straight to production. The order is that behavior is checked in production[^workflow].

The verify job checks the commit messages in the pushed range with commitlint, looks for leaked secrets with gitleaks, and then runs `vp run verify`. The deploy job waits for verify to succeed, and runs `alchemy deploy` only if its own commit is still the head of main at that point. This prevents an older commit from being deployed later when there are consecutive pushes.

```yaml
- id: head
  run: |
    current="$(gh api "repos/$GITHUB_REPOSITORY/commits/$REF_NAME" --jq .sha)"
    if [ "$current" = "$HEAD_SHA" ]; then
      echo "latest=true" >> "$GITHUB_OUTPUT"
    fi
- if: steps.head.outputs.latest == 'true'
  run: vp exec alchemy deploy --stage production --yes
```

There is also the approach of cancelling old runs with GitHub's concurrency settings, but I want to keep commits that passed verify instead of cancelling them, so it checks whether the commit is the head right before deploying.

Production is also measured after deploying.

| Measurement               | When                 | Mechanism                                                                                                                                                                                        |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lighthouse Web Vitals     | Right after a deploy | `tools/web-vitals` measures the production URL and navigations triggered by clicking same-origin links with a user flow. If any of LCP, INP or CLS does not reach a passing score, the job fails |
| ZAP baseline scan         | Once a week          | `zaproxy/action-baseline` is run against production. Everything, including warnings, is fixed, and only false positives are written to `rules.tsv`                                               |
| Time taken by each CI job | For each workflow    | The last job sends the times of jobs and steps to my own Worker. The Worker checks the sender with GitHub's OIDC token and keeps them in Workers Logs                                            |

When verify fails, the autofix job starts and calls the autofix workflow, passing the ID of the failed run, the branch and the commit. autofix checks that the commit is still the head of the branch. If the failure is on main, it cuts a branch for the fix and runs Claude with [claude-code-action](https://github.com/anthropics/claude-code-action). The prompt instructs it to read the failure log with `gh run view --log-failed`, fix the root cause without weakening lint, repeat until `vp run verify` passes, and commit. If a commit was made, it pushes, and if it is a fix branch, it opens a draft PR. Dependency updates are automerged by Renovate, and releases are cut by release-please[^automation]. It gets rid of places where people have to do things by hand on a regular basis.

## Rules for working with AI agents

The top-level principle in CLAUDE.md is how to choose the means when you want to enforce or recommend something[^principle].

1. The library's official means of integration (lint rules, skills, plugins, CLIs and so on)
2. Existing libraries and tools that achieve it
3. Blogs, issues and discussions that propose the policy
4. Building it yourself

Building it yourself comes last. It also bans disabling or simplifying settings to get checks to pass, lowering thresholds, and using suppression directives. This is because the first thing that happens when you leave things to agents is "turn lint off and get it to pass."

These rules are not only written as text but also enforced mechanically with Claude Code hooks[^hooks]. The hooks are small scripts registered in `.claude/settings.json`, all written in Effect.

| Timing                    | What runs                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At the start of a session | Installs dependencies. Notifies you if there is a new release of the template                                                                                                                     |
| Right before running Bash | Parses the command as shell syntax, and if it runs pnpm directly, even deep inside `env` or `bash -c`, refuses it and returns how to write it with `vp`                                           |
| After editing files       | Runs fallow with `--changed-since HEAD` on the edited workspace, and sends things back if dead code or unused dependencies appear                                                                 |
| At the end of work        | Runs `vp run verify`, and stops the end if it fails. The agent reads the log and continues working                                                                                                |
| At the end of work        | Four reviewer agents read `git diff`. Each looks at one thing: loosened checks, the justification for building things yourself, colocation in Feature-Sliced Design, and the use of web standards |

The hook that stops the end only looks at the result of verify and writes JSON that Claude Code interprets to standard output.

```ts
runHook(
  Effect.gen(function* stopGate() {
    const verify = yield* runCommand(yield* localBin("vp"), ["run", "--log", "grouped", "verify"]);
    if (!verify.succeeded) {
      yield* writeJson(StopOutput, {
        decision: "block",
        reason: `vp run verify が失敗している。\n${verify.output.slice(-REPORTED_OUTPUT_LENGTH)}`,
      });
    }
  }),
);
```

If `decision` is `block`, Claude Code cannot finish its response, and the `reason` becomes the agent's next input as it is. The end of the failure log is passed, so the agent reads what broke and goes straight to fixing it.

The reviewer agents are Claude Code hooks of the `agent` type, given a prompt and material for judgment (`git status`, `git diff HEAD`, `git log main..HEAD -p`). If there is a problem, they return `ok: false` and how to fix it, and that is sent back to the agent itself.

There is also a self-improvement loop called `/loop`[^loop]. Its contents are a three-line procedure. For the libraries and tools in use, look for stricter means of checking that have not been applied yet, in the order of the top-level principle. When you find one, confirm that it fails with an intentional violation and passes when that is reverted, and then add it. The rule is to start it with no arguments at the beginning of a session, so the template does not stop at the point it was handed out, and becomes stricter each time it is used.

## Taking in template updates

Repositories created from a template tend to be left alone even when the original template is updated. Here, release-please cuts versions of the template, and the session start hook on the derived repository's side presents the procedure for taking in the differences[^release].

The hook reads the version it has taken in from `.github/release-please/manifest.json`, and gets the template's latest release through the GitHub API. If there is a difference, it returns instructions to the agent as Claude Code's `additionalContext`, telling it to report in its first response that there is a new release and what changed. The procedure for when you answer that you want to take it in is also written there.

```sh
git fetch --no-tags https://github.com/masseater/typescript-template.git \
  refs/tags/v0.0.9:refs/template/v0.0.9 refs/tags/v0.0.10:refs/template/v0.0.10
git diff refs/template/v0.0.9 refs/template/v0.0.10 | git apply --3way
```

Only the difference between the two tags is applied with a 3-way merge, so only the places that collide with changes on the derived repository's side remain as conflicts. The agent proceeds through resolving the conflicts, passing `vp install` and `vp run verify`, and committing.

## Related

I wrote about the significance of developing in a public repository in [another post](/blogs/public-repo-development), and about what becomes free when you go public in [the summary of free plans for OSS](/blogs/oss-free-plans). The reasons for adopting Effect everywhere are in [AIにコードを書かせるならEffectを全面採用する](/blogs/effect-for-ai).

[^structure]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「構成」「配置」「その他」と [apps/web/src/shared/api](https://github.com/masseater/typescript-template/tree/main/apps/web/src/shared/api)

[^alchemy]: [apps/web/alchemy.run.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/alchemy.run.ts)、[apps/web/app-name.test.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/app-name.test.ts)

[^edge-guard]: [apps/web/edge-guard.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/edge-guard.ts)、[apps/web/honeypot.worker.ts](https://github.com/masseater/typescript-template/blob/main/apps/web/honeypot.worker.ts)

[^verify]: [vite.config.ts](https://github.com/masseater/typescript-template/blob/main/vite.config.ts)

[^restricted]: [lint.config.ts](https://github.com/masseater/typescript-template/blob/main/lint.config.ts)

[^decision]: [decision-rules.ts](https://github.com/masseater/typescript-template/blob/main/decision-rules.ts)

[^docs]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「文書」

[^workflow]: [.github/workflows/verify.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/verify.yml)

[^automation]: [autofix.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/autofix.yml)、[zap.yml](https://github.com/masseater/typescript-template/blob/main/.github/workflows/zap.yml)、[ci-telemetry.sh](https://github.com/masseater/typescript-template/blob/main/.github/scripts/ci-telemetry.sh)、[renovate.json](https://github.com/masseater/typescript-template/blob/main/renovate.json)

[^principle]: [CLAUDE.md](https://github.com/masseater/typescript-template/blob/main/CLAUDE.md) の「最上位原則」

[^hooks]: [.claude/settings.json](https://github.com/masseater/typescript-template/blob/main/.claude/settings.json)、[.claude/hooks](https://github.com/masseater/typescript-template/tree/main/.claude/hooks)

[^loop]: [.claude/loop.md](https://github.com/masseater/typescript-template/blob/main/.claude/loop.md)

[^release]: [.claude/hooks/template-release.ts](https://github.com/masseater/typescript-template/blob/main/.claude/hooks/template-release.ts)
