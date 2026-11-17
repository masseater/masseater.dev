# @r_masseater/ocr-decide

Open an image of an invoice or a receipt in the [demo](https://masseater.dev/ocr-decide/), and it reads the issuer, issue date, total amount, consumption tax amount and registration number.

The page runs two methods side by side: passing the image directly to a vision model, and running OCR first and letting a decision model choose. The same page shows the accuracy, time and cost of both methods on 20 images.

```sh
npm install @r_masseater/ocr-decide effect
```

## Agent skills

The package ships TanStack Intent skills for coding agents. Load one with `vp exec intent load @r_masseater/ocr-decide#<skill>`.
