---
title: "What I did from November 1 to 5, 2026"
description: "A record of the first week of November. I built a foundation that lets AI carry work through to the end without stopping to check with me, and with my hands free, I weighed in on the things I wanted to make."
tags: ["振り返り", "Claude Code", "MCP", "Cloudflare"]
published: true
---

I have AI agents such as Claude Code build almost everything I make personally. My job is to decide what to make and to send things back where I think they are wrong. The trouble is that the AI stops and checks with me every time it needs to register a token or add a permission, and nothing moves while it waits for my answer. In the first week of November, I set things up so that the AI could carry work through to the end without checking with me, and with my hands free, I weighed in on the things I wanted to make.

## Tokens for CI

For CI to deploy to Cloudflare, a token has to be registered as a GitHub secret. Every time I made a new repository, Claude asked me to register this token. I asked for 「場当たり的ではなく根本的な解決を」, and had the masseater.dev Worker issue the tokens and keys that CI uses on the spot. Now I do not register secrets by hand. I also got rid of the confirmation when adding permissions to my own repositories by saying 「毎回聞くのやめてほしい」.

## IaC for GitHub and merging repositories

I also had the settings of my GitHub repositories managed as code, as IaC, instead of lining them up on the settings screens. I want the fact that it is written as IaC to be public, but I do not want to write about private repositories in a public repository. So the IaC lives in the public masseater.dev, and the names of private repositories are fetched at run time.

With the IaC in place, I also had the repositories that had multiplied too much folded up. The lint rule collection moved into lint-kit, which gathers my own lint tools, and the benchmark of Japanese decision models moved into decision-experiments, which gathers experiments with decision models. The mosaic moved into masseater.dev, and the original repositories were archived.

## Removing ESLint and TypeScript 7.1

I removed ESLint from every repository. Linting had moved to oxlint, which is written in Rust, and all that was left in ESLint were the rules that need type information. I had a package made that runs those rules on oxlint and put it in lint-kit.

At first, Claude built this package on the API of the old TypeScript 6. I asked 「なんで ts6 で組み立ててるの」 and had it moved onto tsgo, the TypeScript 7 compiler rewritten in Go, and it became faster than ESLint. I had TypeScript brought to 7.1 and Node.js to 26 or later in every repository.

When I upgraded the Effect dependency to 4.1, Claude sent up a lot of PRs that kept things working by pinning the old 4.0.0. I said 「ちゃんと対応して」 and had it fix the lint-kit side, which was the cause of the pin.

## The writing skill

In the text AI writes, the same habits come back every time I point them out. So I have my feedback added to the writing skill, and from then on the AI reads it before writing. I also had the README of every repository rewritten with this skill.

## measure-everything

The most important thing in development in the AI era is not implementation but measurement. When the portal that gathers my personal MCP servers could not connect, Claude kept piling up fixes based on guesses without even reading the logs. I stopped it with 「ちゃんと計測するのが第一や」 and had it make the logs and traces readable first.

I turned this idea into [measure-everything](https://github.com/masseater/measure-everything), a repository for measuring everything on top of the existing ecosystem. It holds parts that check the traces that arrive during tests and parts that measure how fast pages display.

## CSP for the public site

On masseater.dev, the vulnerability scanner ZAP checks production on every deploy. Because I had written down the rule that everything, including warnings, gets fixed right away, Claude added a CSP, which tells the browser where scripts may be loaded from, and security headers to the whole site without me saying anything.

## The MCP portal

I use a personal agent like Meta's [Muse](https://www.techrepublic.com/article/news-meta-muse-ai-agent-us-launch/), which handles reservations and shopping on its owner's behalf. While using it, I had the sense that the market for personal agents was spreading. For an agent to act on its owner's behalf, it needs the owner's information. The way AI agents use outside tools and data has become a standard called MCP, so I had the MCP servers that hand over my information gathered in one place, `mcp.masseater.dev`.

Each MCP server was meant to work on its own with an ordinary OAuth login. Claude proposed connecting them with service tokens that skip the login, but that would have made them unusable on their own, so I had it withdrawn.

## konomi

A personal agent also needs its owner's tastes. The records of the videos I watched, the songs I listened to, the games I played and the books I read are scattered across services. I thought an MCP server for personal agents that pulls my own information from each service through a single interface would be well received, so I started [konomi](https://konomi.masseater.dev). For what to import, I said 「趣味嗜好を集めて分析する観点で全て」, and had it expanded to videos, music, games, books, illustrations and social media, including services whose data can only be fetched through unofficial APIs.

## mirucord

[mirucord](https://mirucord.masseater.dev) is an MCP server that lets AI read the conversations on a Discord server. That week, a request came from Iroha, the personal agent I use on Discord, saying it wanted to pick up human relationships with mirucord. It was not me who asked; the agent that uses mirucord told us what features were missing.

Before having the request built as it was, I said 「必要なものを選ぶ前に取れるものを全部知るのが先」 and had it look into everything a Discord bot can get. Then I decided that mirucord would only return the facts visible on Discord, and leave interpretations such as who is close to whom to the agent that uses it. I had it add features that return the member list, people joining and leaving voice calls, and reactions. Things that had been added once, such as the record of invites, I had removed with 「今要らない、無駄な機能を残すな」.

## What I put on masseater.dev

| Target                                        | What I had built                                                                                                                                                | What I weighed in on                                                                                                            |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [Sloppedia](https://masseater.dev/sloppedia/) | A Wikipedia-style imitation of a personal encyclopedia. It replaced the place for short notes introducing outside articles                                      | With 「君の投稿も入れるんだから君がやりなよ」, I left building it to Claude too. Sloppedia is the only place where AI can write |
| [mosaic](https://masseater.dev/mosaic/)       | A mosaic that draws a character's picture with thumbnails of videos of that character's songs. I had a large number of singing voice synthesis characters added | 「バリエーションが落ちても良いから細かく」「ハードコードより自動調整」                                                          |
| Figures in posts                              | Figures that can be embedded in posts and moved by touching them                                                                                                | 「mermaid はしょぼい」                                                                                                          |

[rpp-kit](https://masseater.dev/rpp-kit/) is a demo that reads project files of the music production software REAPER with TypeScript types. It was on a different domain, so I had it moved with 「masseater.dev 配下にしなよ」, and had a playground added where you can try how a loaded file is handled as code. To a screen that lined everything up at once I said 「codepen 見て」, and to an example where the file's types were written by hand I replied 「自分で declare は普通にダメ」.

I also had a [satsuei lab](https://masseater.dev/satsuei-lab/) made, where you can try anime compositing step by step, and a 3D model of the [rear-trigger split pad](https://masseater.dev/split-pad/), a controller with its buttons moved to the back.

With less time spent waiting for confirmations, what I did that week was mostly look at what came up and say it was wrong.
