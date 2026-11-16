---
name: extract-invoice-fields
description: >
  Use when reading the issuer, issue date, total, tax or registration number from an invoice or
  receipt image with @r_masseater/ocr-decide: extract, the three methods, decision model choice,
  custom fields and the OpenRouter layer. Also use when comparing OCR plus decision models against
  sending the image to a vision model.
metadata:
  type: core
  library: "@r_masseater/ocr-decide"
  library_version: 0.1.0
sources:
  - src/app/index.ts
  - src/features/extract-fields/**
  - src/entities/fragment/**
  - src/shared/api/**
---

# extract-invoice-fields

`extract` reads fields from an invoice or receipt image. With the decision methods it runs OCR on the image and lets a decision model pick which OCR line holds each field, so the answer is always text that is on the page. The models run on OpenRouter.

## Setup

```sh
npm install @r_masseater/ocr-decide effect
export OPENROUTER_API_KEY=sk-or-...
```

`openRouter` reads `OPENROUTER_API_KEY`. `openRouterWithKey(key)` takes the key directly.

## Extract the fields

```ts
import { readFile } from "node:fs/promises";

import {
  DEFAULT_DECISION_MODEL,
  INVOICE_FIELDS,
  extract,
  openRouter,
} from "@r_masseater/ocr-decide";
import { Effect } from "effect";

const image = new Uint8Array(await readFile("receipt.jpg"));

const extraction = await Effect.runPromise(
  extract({
    image,
    fields: INVOICE_FIELDS,
    method: "ocr-decision",
    model: DEFAULT_DECISION_MODEL,
  }).pipe(Effect.provide(openRouter)),
);

for (const [id, value] of Object.entries(extraction.values)) {
  console.log(id, value.status === "found" ? value.text : "missing");
}
console.log(extraction.costUsd);
```

## Choose a method

| Method                | What it does                                                  |
| --------------------- | ------------------------------------------------------------- |
| `ocr-decision`        | OCR, then a decision model picks the line for each field      |
| `ocr-reread-decision` | Same, but lines read with low confidence are read again first |
| `image-generation`    | Sends the image to a vision model, which writes the values    |

`DECISION_MODELS` lists the decision models the package supports. `CUTOFF` is the probability a line needs before it counts as the answer; below it the field is `missing`.

## Custom fields

A field is `{ id, label, description }`. The description tells the model what the field is and what it is not, such as "the total including tax, not the subtotal". Write it the same way for fields of your own.
