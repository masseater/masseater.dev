---
title: "fallow similar-code"
description: "fallow similar-code finds functions that do the same thing in different syntax with a local embedding model, and leaves the decision to a separate verdict document. This post compares it with fallow dupes on sample code and on a monorepo."
tags: ["fallow", "TypeScript", "静的解析"]
published: true
---

`fallow dupes` finds code that was copied and then renamed. It does not find the same calculation written a second time in a different style, such as a `for` loop in one file and a `reduce` in another. `fallow similar-code` covers that gap. It turns each function into a vector with a local embedding model and lists the pairs whose vectors are close[^fallow-similar-code-docs]. [The fallow post](/blogs/fallow) covers the other commands.

## What dupes misses

The test project has three functions that compute a cart total. `orderTotal` is `cartTotal` with its variables renamed. `invoiceAmount` computes the same value with `reduce`.

```ts
export function cartTotal(items: readonly Item[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

export function orderTotal(entries: readonly Item[]): number {
  let sum = 0;
  for (const entry of entries) {
    sum += entry.price * entry.quantity;
  }
  return sum;
}

export const invoiceAmount = (lines: readonly Item[]): number =>
  lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
```

With fallow 3.43.1, the results were as follows. I ran dupes with `--min-tokens 20 --min-lines 3` so that small functions could match.

| Pair                             | `dupes --mode mild` | `dupes --mode semantic` | `similar-code` score |
| -------------------------------- | ------------------- | ----------------------- | -------------------- |
| `cartTotal` and `orderTotal`     | Not found           | Found                   | 0.83                 |
| `orderTotal` and `invoiceAmount` | Not found           | Not found               | 0.76                 |
| `cartTotal` and `invoiceAmount`  | Not found           | Not found               | 0.72                 |

The default mode of dupes compares token sequences with the names kept, so renaming alone hides a copy. Semantic mode replaces names and literals, so it finds the renamed copy. Neither mode finds the `reduce` version, because the order of the tokens differs. Only `similar-code` gives that pair a score.

## A score is not a verdict

The default threshold of `similar-code` is 0.8, so with the default settings the `reduce` pairs are not shown. The results above are with `--threshold 0.5`. Before the list of candidates, the command prints "model scores are cosine similarity, not probability or a refactoring verdict", and it labels each candidate as unverified. The documentation describes the division of work in one line: "a pinned local model finds them, and a human decides"[^fallow-similar-code-docs].

The model is `jinaai/jina-embeddings-v2-base-code` under the Apache-2.0 license, pinned to one revision. After a setup that downloads it once with explicit consent, the analysis runs offline, and source code does not leave the machine[^fallow-similar-code-docs]. The model files took 310 MB in the user cache.

## Write verdicts in a separate document

Judging takes three steps. First, `fallow similar-code inspect <candidate_id> --candidates similar-code.json` shows the source of both functions. The output ends with the words "Decide candidate_worthy, behaviorally_equivalent, and refactor_safe separately".

```text
src/invoice.ts:3  invoiceAmount
(lines: readonly Item[]): number =>
  lines.reduce(
    (sum, line) => sum + line.quantity * line.price,
    0,
  )

src/cart.ts:6  cartTotal
function cartTotal(items: readonly Item[]): number {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}
```

Verdicts are written not in the candidate list but in a separate JSON document. Each verdict has three independent axes and an outcome. `refactor_safe: true` requires `behaviorally_equivalent: true`, which in turn requires `candidate_worthy: true`[^fallow-similar-code-skill]. The outcome is one of `same-responsibility`, `related-but-distinct`, `intentional-duplication`, `unrelated` and `needs-human-review`. Intentional duplication is one of the expected answers.

```json
{
  "schema_version": "1",
  "verdicts": [
    {
      "candidate_id": "similar-code:candidate:v1:ba7f6fe4…",
      "review_key": "similar-code:review:v1:…",
      "candidate_worthy": true,
      "behaviorally_equivalent": true,
      "refactor_safe": true,
      "outcome": "same-responsibility",
      "rationale": "Both multiply price by quantity and sum the lines."
    }
  ]
}
```

`fallow similar-code review` joins the candidates and the verdicts without changing either file. With verdicts for two of the three candidates, the third is reported as `needs-human-review`. With `--require-verdict-for-each-candidate`, it fails with "a verdict is required for every candidate".

```text
src/invoice.ts:3 invoiceAmount
  <-> src/cart.ts:6 cartTotal
  Match: unverified
  Outcome: needs-human-review
  Rationale: no safely matched verdict

Reviewed: 3 candidates, 2 matched verdicts, 1 unmatched candidate
```

When I ran discovery again on unchanged code, the candidates' `candidate_id` and `review_key` stayed the same. So a verdict file saved in the repository points at the same pairs on the next run, and only new or changed pairs come out as candidates without a verdict.

## It stays out of the checks that stop builds

fallow leaves `similar-code` out of the analysis with no arguments, the pass or fail of `audit`, SARIF, editor diagnostics and auto-fixes[^fallow-changelog]. Its exit code does not fail on candidates. The design fits the verdict list above. A score of 0.83 can be a forgotten copy, or two functions that should change separately, and you cannot tell which without reading both. `similar-code` fits a regular review that reads candidates and records verdicts, and dupes remains the check that fails builds.

## Numbers on a monorepo

On a TypeScript monorepo of 2,643 files and about 180,000 lines, in a Linux container with 4 cores, `similar-code` turned 1,414 functions into vectors. The first run took 4 minutes 18 seconds, and the second run, with the vector cache, took 2 seconds. With the default threshold, it returned 65 candidates. The run stopped at the limit of 1,000,000 comparisons and skipped about 27.7 million pairs, so it was marked "partial". Only a complete run makes an empty result conclusive[^fallow-similar-code-skill].

The top candidate, with a score of 1.0, was two identical 7-line functions in separate files that build the same object. `fallow dupes` in its default mode had not reported any clone in the repository, because those functions were below its minimum of 50 tokens.

[^fallow-similar-code-docs]: Find semantically similar functions in TypeScript. fallow documentation. https://fallow.tools/docs/analysis/similar-code/

[^fallow-similar-code-skill]: Semantic Similar-Code Workflow. fallow skill reference, in the fallow 3.43.1 npm package (`skills/fallow/references/similar-code.md`).

[^fallow-changelog]: fallow CHANGELOG. https://github.com/fallow-rs/fallow/blob/main/CHANGELOG.md
