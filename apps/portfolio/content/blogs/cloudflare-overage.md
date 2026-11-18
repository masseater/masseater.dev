---
title: "Cloudflare Workers AI and Containers pay-as-you-go charges (as of 2026-11-17)"
description: "What made Workers AI and Containers go past what Workers Paid includes, the Workers AI calls that did not pass through the AI Gateway, and removing the translation server that had been hosted."
tags: ["Cloudflare", "Workers AI", "コスト"]
published: true
---

On 2026-11-15 and 2026-11-16, Cloudflare billed pay-as-you-go usage on top of the Workers Paid plan. Workers AI (Regular Twitch Neurons) and Containers both went past what the plan includes. These are the numbers from the billable-usage API and GraphQL Analytics, and what was changed.

## Billed amounts

| Date       | Workers AI                        | Containers  |
| ---------- | --------------------------------- | ----------- |
| 2026-11-15 | 771k neurons, $5.41               | $0.19       |
| 2026-11-16 | 118k neurons, $1.30               | $0.17       |
| 2026-11-17 | 5.7k neurons, within the free 10k | about $0.13 |

Workers AI includes 10,000 neurons per day, and anything above that costs $0.011 per 1,000 neurons[^workers-ai-pricing]. It was not billed every day. Only two days went over.

## Workers AI: the decision lint and calls outside the gateway

On 11-15, most of the usage came from the decision lint in GitHub Actions. It called `qwen3.8-27b` for 545k neurons and `gemma-sea-lion` for 207k neurons while the AI Gateway cache was not working. On 11-16, `qwen3.8-27b` still used 66k before the lint moved to `@cf/cloudflare/clef-flash`. By 11-17 the 11-cent daily spend limit on the AI Gateway `default` and the move to `clef-flash` were already in effect.

The spend limit only covers requests that pass through the gateway. Comparing `aiInferenceAdaptiveGroups` with `aiGatewayRequestsAdaptiveGroups` per model showed models that appeared only on the inference side. Those calls skipped the gateway.

| Caller                       | Model           | Why it skipped the gateway                                                    | Fix                                                                         |
| ---------------------------- | --------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| mirucord web                 | gemma, bge-m3   | `@r_masseater/workers-tracing` 0.3.0 does not add the gateway to `env.AI.run` | Upgrade to 0.5.0 and pass the options `runWorkersAi` builds to `env.AI.run` |
| personal-space slide indexer | qwen3-embedding | It calls the REST `/ai/run` endpoint directly                                 | Send the `cf-aig-gateway-id` and `cf-aig-metadata` headers                  |

The amounts were small, but they had no upper limit.

## Containers: plamo-translate

The Containers usage came from plamo-translate, the translation server that the plamo-ja plugin used. It ran on the `standard-1` instance type, which allocates 4 GiB, and woke for about 10 minutes every hour.

Containers include 25 GiB-hours of memory per month, and anything above that costs $0.0000025 per GiB-second[^containers-pricing]. The monthly allowance ran out on 11-15. From then on, every minute it ran was billed. Its peak memory use was about 1.15 GiB, so it held about 3 times the memory it needed.

Containers have no spending cap. The spend-policies API only covers `workers` and `durable_objects`. The only ways to lower the bill were to run it less, give it less memory, or remove it.

## Removing the hosted translation

The plan was to shrink it from 4 GiB to 2 GiB. Then masseater pointed out that a model that runs inside a Claude cloud session VM does not need to be served as an MCP tool.

:::masseater
まあplamo翻訳はツール自体削除かもなあこれ。どうせclaudeのクラウド環境のvmでも動くくらいだから、mcpとして提供する必要はないかも
:::

So the hosted translation was deleted, not shrunk. The replacement was ready and tested before anything was removed.

| Use                                         | Before                                 | After                                                                                              |
| ------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Translating documents                       | `sundries_translate` on the MCP portal | The plamo-ja `translate` skill, using the `llama-server` that plamo-ja already runs in the session |
| watashi-mcp translating traits and profiles | The plamo-translate container          | `@cf/google/gemma-4-26b-a4b-it` through the AI Gateway `default`                                   |

The code went away in [masseater.dev#1292](https://github.com/masseater/masseater.dev/pull/1292). Removing the code does not remove the resources in production, though. The Worker, the container application, the Durable Object namespace, the custom domain and the Access application stay in the Alchemy state. The Cloudflare token on the MCP portal is read-only, so the API could not delete them directly. A one-time step added `alchemy destroy` for the old stack to the sundries deploy ([masseater.dev#1317](https://github.com/masseater/masseater.dev/pull/1317)), and the next PR removed that step again.

## Checks after the change

After the deploy, the Cloudflare API showed that the Worker, the container application, the domain and the Access application were gone. Between 22:30 and 23:50 UTC on 11-17, Containers usage was zero. Every Workers AI request in that window went through the gateway: 1,194 for `clef-flash` and 20 for `plamo-embedding-1b`.

The daily Cloudflare cost check now also flags any day with a billed cost above zero, and compares inference with gateway requests per model to find calls that skip the gateway. It also has a rule not to host a model in a container when the caller can run it.

[^workers-ai-pricing]: [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

[^containers-pricing]: [Workers pricing: Containers](https://developers.cloudflare.com/workers/platform/pricing/#containers)
