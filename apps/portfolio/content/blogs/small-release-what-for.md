---
title: "What are you trying to do by releasing small?"
description: "What do you want to achieve by releasing small? Can it only be achieved by making things small? Are you really achieving it by making things small? Not only small releases, but existing software development flows in general should be doubted again with these questions."
tags: ["AI", "開発", "ポエム"]
published: true
---

When I was running several repositories in parallel in Claude threads, the Claude acting as coordinator told each thread, "to avoid colliding with the other threads, split the template changes small and merge them first." I replied like this.

> 小さく先にマージすることに意味はないっす
>
> 根本をちゃんと解決してね

Everyone knows releasing small as a good habit of software development. Claude knows it too, and tries to split things small without being asked. That is exactly what I want it to doubt. What are you trying to do in the first place, can it only be achieved by making things small, and are you really achieving it by making things small?

If you ask why people want to make things small, the answers should be things like wanting to narrow the damage when something breaks, or wanting to see reactions early. Some people want an amount that can be read fully in review, and some want to deliver what is done as soon as possible. Nobody wants to ship small for its own sake.

All of these can be achieved without making things small. If you want to narrow the damage, set up a mechanism that can roll back right away when something breaks, and checks that run before merging. Wanting an amount that can be read fully in review is no longer a reason for me, since I [stopped reviewing PRs](/blogs/stop-pr-review). If you want to see reactions, you should think about the mechanism by which someone looks at what you ship.

Whether making things small really achieves anything is also doubtful. Putting a fragment that nobody looks at into main first brings no reactions back. One fragment at a time keeps the damage small, but the problem stays unsolved. The coordinator Claude's instruction, too, may have achieved threads not colliding with each other, but it did not bring us closer to the problem I wanted to solve with the template changes.

Releasing small is only one example. PR review, sprints and how branches are cut are also means made to fit the speed at which people write and people read, and they continue without anyone asking again what they are meant to achieve. Doubt the existing software development flows, all of humanity.

If solving it needs a big change, just put it in big.
