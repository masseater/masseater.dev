---
title: "Let's stop reviewing PRs"
description: "In this one week, 97 PRs were merged into main of masseater.dev, and I did not read the diff of any of them. Everything PR review guaranteed was only half done, and it got by only because development was slow."
tags: ["AI", "開発", "ポエム"]
published: true
---

In this one week, 97 PRs were merged into main of masseater.dev. They were written by Claude or Renovate, and I let them be merged without reading the diffs. The repository's AGENTS.md says 「PR のレビュー、PR ごとの CI・動作検証・デプロイはしない。動作は本番で確かめる」, and Claude merges by itself once the local verify passes. It does not even ask whether it may merge.

Before stopping, I thought about what PR review was guaranteeing in the first place. What comes to mind is keeping bugs out of production, people other than the author knowing the code, naming and design not drifting from the rest, and the reassurance that someone looked. All of these were guaranteed only halfway by review. Bugs that pass review are found in production. The reviewer also knows only the diffs they read, and there has never been anyone who always grasps 100% of the whole picture of a product. Inconsistencies are pointed out only by whoever notices, as far as they notice, and reassurance is not quality.

It got by because development was not actually that fast. What we really should have done was have everyone involved take responsibility and check that things work in production, leave the checking to machines, release fast and take the returns. At the speed people write, having people read PRs was enough to keep things going, and we could skip all of that. Review was a form for getting away without doing what we should have done.

Now that Claude writes dozens of PRs a day, we cannot skip it. A change is not merged into main until a person finishes reading it, and however fast Claude writes, things move only as fast as people read. Review reduces the risk of breaking things, and in exchange it throws away the returns you would get from releasing fast. A business must not tolerate a way of working that makes people the bottleneck and throws away returns. Of risk and return, we should properly take the return.

I also see no meaning in the pretense that "the person who pressed the approve button takes responsibility." When something breaks, everyone involved in the product fixes it, not only the one person who approved it. That does not change now that Claude writes the code.

So I stopped the per-PR checks, and check that things work in production after merging into main. What should remain is the intent and constraints of how to build things; I write them in AGENTS.md and lint rules, and Claude reads them before writing. In this one week, I put in 97 PRs and reverted one, a vite-plus update.
