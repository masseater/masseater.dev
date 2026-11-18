---
title: "Measure everything"
description: "Traces and OpenTelemetry metrics are the starting point, not the goal. I measure before I fix, test that telemetry leaves the process, measure the build and the bill, check that every fact someone will ask for later is recorded, and turn each fixed bug into a measurement that would have caught it."
tags: ["OpenTelemetry", "Measurement", "CI", "Cloudflare"]
published: true
---

Every Worker I deploy sends traces and logs, and every Effect program wraps its work in spans that go out over OTLP. That part is assumed here. Most of my code is written by AI agents, and an agent cannot see what the code does in production. It fills the gap with a guess, and a step later the guess looks the same as a fact. Traces alone do not stop this. What stops it is a set of habits that go further than instrumentation, and this post is about those habits.

## Measure before the fix

On November 3, 2026, I let an agent fix a broken connection to my MCP portal. It made one guessed fix after another without any way to read what the portal was doing. Since then, the first step of any fix is to make production readable: check that the Worker's logs and traces actually arrive, and add instrumentation if they do not. The hypothesis and the value that would confirm it are written down before the measurement, and the change is judged only by the result. Numbers that come from a laptop or a test only show that the measurement works. They are not a reason for a decision.

## Test that the telemetry leaves the process

Instrumentation that silently stops exporting is a regression, and nothing notices it unless a test does. [vitest-otlp](/blogs/vitest-otlp) starts an OTLP receiver for each test file and points the OpenTelemetry SDK at it, so a test asserts on the spans that actually crossed the network. With `semconv: true`, the exported telemetry is also checked by OpenTelemetry Weaver's live-check against the semantic conventions, and the test run fails on a violation.

## Measure the build

My monorepo's `vp run verify` is measured with the same spans as production code. The spans showed that each `vp` process spent 2.9 seconds reading the root configuration, and that the cache of a msch check put absolute paths into its keys, so a change to any file of msch made the whole cache cold. Both were invisible from the total time alone.

The CI itself is checked by a scheduled task every morning. It reads the duration of the last week of runs on main and treats a state where most successful runs take more than 10 minutes as an anomaly. On November 17 the verify runs took 37 to 50 minutes. Each fix since then has been judged by a number:

| Change                               | Before                 | After                              |
| ------------------------------------ | ---------------------- | ---------------------------------- |
| Type checking on tsrs                | 193 to 212 s, 10.8 GiB | 100 to 108 s, at most 7.7 GiB      |
| Setup of the verify job              | 165 s                  | 101 s                              |
| sccache in CI, Rust hit rate         | 0 % (first run)        | 95 % (2,006 hits, 101 misses)      |
| Remote task cache in a fresh session | No hits                | 55 of 138 tasks hit, 1,949 s saved |

The sccache change was adopted on the condition that it would be removed if the measured effect on main was small. A cache that does not hit is only cost, so the hit rate is the number that decides whether it stays.

## Measure the bill

Cloudflare bills by usage, and an AI model call costs money each time it runs. Every call goes through AI Gateway with metadata naming the tool, the repository and the context, so a cost can be traced to its caller. In steady state, my decision lint made 4,477 requests a day, 72 % of them cache hits, for $0.74 a day, about $0.0006 per file. On November 15, before the cache worked, the same lint cost $5.41 in one day.

Attribution is not enough if some calls skip the place that records them. On November 17 I compared the model inference counts from Workers AI with the request counts from AI Gateway, model by model. The difference led to two callers that bypassed the gateway, and both were moved behind it, where a daily spend limit caps them. A scheduled task reads the account's usage every day and checks it against the included usage of the Workers Paid plan.

## Record what will be asked later

The question comes after the data. Nobody decides in advance what to record for an investigation that has not happened, so logging stays at the platform's defaults: requests without a caller, logs that expire before the invoice arrives, and a gateway that some calls go around. For each question that someone may ask later, such as who caused a cost or an error and since when, I check four things on the running system and not in its configuration. The event is recorded without sampling it away. The record names its caller in a field that can be filtered. The store keeps it at least until the question is asked, which for costs means past the next invoice. And every call reaches the place that records it, which is shown by comparing it with an independent count such as the invoice. Each answer is proven by running the query that answers it on today's data.

## Turn each fix into a measurement

When a PR fixes a bug, the bug is treated as solved, and the missing measurement that should have reported it first stays missing. So I read fixed PRs and ask which measurement would have prevented the bug or caught it earlier. The first review found that 5xx responses and exceptions in production, such as a 503 from one app, a 500 from the owner sign-in and errors in the credential broker login, had gone unrecorded until I hit them myself. Every Worker now turns on Cloudflare's Workers Issues, which groups errors without anyone having to watch. The second review found build failures that only appeared at deploy time, so the verify of those apps now depends on their build.

## Measure the agents

The agents' own work is measured too. On November 17, about 40 threads started and 194 PRs were merged across my repositories. An hourly audit thread counts the stalled threads, the merges it pushed through and the threads it consolidated, and over 24 runs it found 23 stalls. Without those counts, I would know only that many things happened, not where the work waited.

## What comes next

Some measurements still have nowhere to go. The CI sends only job and step durations, so the spans of a msch run in CI are lost, and I read them only when I run it in a session. The other direction is to let the measurement drive the agent instead of only judging it afterwards. The OpenTelemetry project recently described an agent team that instruments GenAI frameworks with Weaver's live-check as the gate: a violation sends the work back to the coding agent, and a clean run moves on to a soak test[^otel-agent-harness]. The same loop fits my checks. A rule in msch, a test in vitest-otlp or a budget in CI is a measurement that an agent cannot argue with, and the more of them there are, the less of my code depends on a guess.

[^otel-agent-harness]: [Building an Agent Harness for OTel Instrumentation with GenAI Semantic Conventions and Weaver, OpenTelemetry Blog](https://opentelemetry.io/blog/2026/agent-harness-genai-instrumentation/)
