---
name: measure-web-vitals
description: >
  Use when measuring LCP, INP and CLS of page loads and same-origin link transitions with
  @r_masseater/web-vitals-flow, for example as a CI gate after a deploy: the command, its flags,
  Chrome in containers, the reports and how a run fails.
metadata:
  type: core
  library: "@r_masseater/web-vitals-flow"
  library_version: 0.2.0
sources:
  - bin/web-vitals-flow.ts
  - src/**
  - README.md
---

# measure-web-vitals

`web-vitals-flow` runs a Lighthouse user flow over each URL. It loads the page, then clicks every same-origin link on it. It runs the flow several times and judges each step by the median. It exits with an error when the LCP, INP or CLS of any step misses Lighthouse's passing score. It also reports FCP, TTFB and TBT.

## Prerequisites

It needs Node.js 26 or later and Chrome. Set `CHROME_PATH` when Chrome is not found.

## Run it

```sh
vp dlx @r_masseater/web-vitals-flow https://example.com/ https://example.com/pricing
```

| Flag             | Default  | Effect                                                    |
| ---------------- | -------- | --------------------------------------------------------- |
| `--runs`         | `5`      | How many times the flow runs                              |
| `--chrome-flags` | none     | Space-separated flags passed to Chrome                    |
| `--report-dir`   | `report` | Where `flow-<run>.html` and `flow-<run>.json` are written |

In a container, pass `--chrome-flags="--no-sandbox"`.

## Read the result

A failing run names each step and metric that missed the passing score. Open `flow-<run>.html` in the report directory to see the Lighthouse report of that run.

## Common mistakes

Do not measure with `--runs 1`. A single run is noisy, and the median needs several.
A page behind a login cannot be measured, because the flow starts from a fresh browser and sees the login page.
