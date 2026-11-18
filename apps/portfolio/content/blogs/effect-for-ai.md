---
title: "If you have AI write your code, adopt Effect everywhere"
description: "Effect puts failures and dependencies into types, and effect-tsgo enforces using them correctly through type checking. If you have AI agents write your code, adopt it everywhere, with no exceptions for CLIs or small scripts."
tags: ["Effect", "effect-tsgo", "TypeScript"]
published: true
---

## Defects that keep appearing in code written by AI

The following defects keep appearing in TypeScript written by AI agents.

| Defect                          | Code                                                    |
| ------------------------------- | ------------------------------------------------------- |
| No timeout                      | Calling `fetch` with no time limit                      |
| Unlimited concurrency           | Passing an array of thousands of items to `Promise.all` |
| Swallowing errors               | `catch (e) {}`                                          |
| Cancellation does not propagate | Forgetting to pass the AbortSignal along the way        |
| Broken retries                  | A hand-written retry loop that never stops              |

All of these pass type checking, because what a function can fail with, what it depends on and when it releases resources do not appear in its type.

## Effect puts failures and dependencies into types

The `Effect<A, E, R>` of Effect (effect-ts) has three type parameters.

| Type parameter | What it represents             |
| -------------- | ------------------------------ |
| `A`            | The value on success           |
| `E`            | The errors that can occur      |
| `R`            | The dependencies needed to run |

As of October 2026 the default is v4, where HTTP, SQL, CLI, AI, Schema, Config and Stream sit on the same core, and the dependency has become a single package[^effect-docs].

## How it differs from Result type libraries

If all you want is to put errors into types, Result type libraries such as neverthrow and ts-results can do that too. There are two differences.

### Lazy evaluation and the runtime

A Result type represents the result of something that has already run. Effect is a description of a lazily evaluated program, and the runtime runs it. Because of this, how it runs can be composed with combinators.

| Defect                           | How to write it in Effect                     |
| -------------------------------- | --------------------------------------------- |
| No timeout                       | `Effect.timeout`                              |
| Unlimited concurrency            | `{ concurrency: 5 }`                          |
| Broken retries                   | Passing a `Schedule` to `Effect.retry`        |
| Resources left behind on failure | `Effect.acquireRelease`                       |
| Cancellation does not propagate  | Interrupts to a Fiber propagate automatically |

Every defect at the top of this post is a hand-written, broken version of something these can express.

### `R`, which represents dependencies

A Result type has no place to represent dependencies. In Effect, when a piece of processing needs a database or an HTTP client, that shows up in `R`, and forgetting to provide the Layer is a type error. In tests, you swap the Layer.

## The advantage for AI

An agent can learn the failures and dependencies from the signature without reading the implementation. If you add a kind of error, every place that fails to handle it shows up as a type error. Unlike tests and runtime exceptions, type errors are deterministic and come back immediately, so the fix loop runs reliably. The official documentation also lists this as a strength[^effect-docs].

## The pitfall of lazy evaluation

An Effect that is neither yielded nor assigned is not run.

```ts
const program = Effect.gen(function* () {
  saveUser(user); // yield* がないので保存は実行されない
  yield* sendWelcomeMail(user);
});
```

This is not a type error. Unlike forgetting to await a Promise, the processing itself does not happen.

## effect-tsgo enforces correct use

### What it is

The package name is `@effect/tsgo`, and it is a build of TypeScript-Go, the TypeScript compiler written in Go, with the Effect Language Service built in[^effect-tsgo].

| Feature     | What it does                                                                                       |
| ----------- | -------------------------------------------------------------------------------------------------- |
| Diagnostics | More than 50 kinds, including floating Effects, unhandled error types and unsatisfied dependencies |
| Refactors   | Converting from async/await to Effect, converting between `Effect.gen` and `Effect.fn`, and more   |

### How it differs from lint

The diagnostics are output as ordinary TypeScript diagnostics[^effect-devtools].

|                            | The step where it runs             | Can it be avoided                                                |
| -------------------------- | ---------------------------------- | ---------------------------------------------------------------- |
| `eslint-plugin-neverthrow` | A lint separate from type checking | It can be removed from the settings, and people forget to run it |
| effect-tsgo                | Type checking itself               | It cannot be avoided as long as type checking has to pass        |

The same diagnostics appear in the editor, in CI and in agent runs alike. A library means nothing if it is not used, but for Effect, the official project provides the means to make people use it correctly.

## Make no exceptions

If only CLIs and small scripts use a Result type and lint, there are two ways of writing error handling. The agent decides which one to use every time and gets it wrong. Types are cut off at the boundary between the two, and that boundary falls outside effect-tsgo's diagnostics.

Adopting it everywhere is easy to maintain. The caller of a function that returns an Effect cannot get the value out without receiving it in Effect. To satisfy `R`, you have to write a Layer. Existing async/await code can be migrated with effect-tsgo's refactors.

## Costs

| Item         | Details                                                                                                                                                          |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API          | It is large and has changed from v3 to v4. Most of the training data of LLMs is from v3 or earlier, so APIs that do not exist and outdated styles tend to appear |
| Type errors  | They are long and consume context                                                                                                                                |
| Maturity     | effect-tsgo is still alpha, and breaking changes between releases are expected                                                                                   |
| Requirements | It needs the native version of `typescript` 7 or later, and using it together with plain tsgo and its language server duplicates diagnostics[^effect-tsgo]       |

[^effect-docs]: [Effect v4 docs](https://effect.website/docs/v4/)

[^effect-tsgo]: [Effect-TS/tsgo](https://github.com/Effect-TS/tsgo)

[^effect-devtools]: [Effect v4 Devtools](https://effect.website/docs/v4/getting-started/devtools)
