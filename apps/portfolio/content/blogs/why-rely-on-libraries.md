---
title: "What do I gain by relying on a library?"
description: "With AI writing my code, I have started to doubt what a library gives me that building it myself does not. Its real value is a record of failures from many environments and upkeep as the world changes. For tools optimized for one person, that value is small inside my own environment and large at the boundaries with the outside world."
tags: ["AI", "Libraries", "Development"]
published: true
---

I have started to wonder what I actually gain by relying on a library instead of building the thing myself. I already rebuild linters and checks for my own use, and I wrote the reasons in [Building everything myself](/blogs/build-everything-myself). This post is not about those tools. It is about a doubt that has grown since then, and where it has led me so far.

## A few maintainers against all of the knowledge

The usual reason to use a library is that its maintainers know the problem better than I do. That reason gets weaker when AI writes the code. An AI model is, in effect, a collection of the knowledge and experience that exists in the world, including what those maintainers wrote in their code, their issues and their documentation. A library is made by a few people, sometimes a few dozen. Having several people involved does not make me expect them to know more than that collection.

So if a library is a package of knowledge, I do not see why I should prefer it to code written for my case by something that has read all of it.

## What a library holds besides knowledge

When I look closer, knowledge is not the main thing a library offers. A popular library has run in a great many real environments, and its code carries the record of how it failed there: the platform that behaved differently, the input nobody expected, the version of a dependency that changed under it. That record is not in the documentation, and it is not something a model can derive by reasoning. It exists because many people ran the code and reported what broke.

The second thing is upkeep. The world around a library keeps changing, and the maintainers follow it, so the library keeps working without my noticing.

## For one person, the environment is fixed

These two things matter in proportion to how many different environments the code has to survive. A library has to work for everyone who installs it, so the failures of thousands of environments are its whole value. My tools have to work for me. They run in my repositories, on my machines and in my CI, and that set changes rarely and only when I change it. Most of the failures that a library has collected come from environments I will never be in.

The failures that do happen in my environment I find by measuring, as I wrote in [Measure everything](/blogs/measure-everything). A tool of my own reports its spans, its tests assert on what it actually exported, and a fix comes with the number that justified it. That replaces, for my one environment, the bug reports that a library gets from its many users.

If the goal is to optimize for one person, building it for myself may be the better choice, not just an acceptable one. The fit to my case is complete, the update cycle is mine, and the main advantage of the library does not apply.

## Except at the boundaries

The exception is where my code meets an outside world that changes on its own schedule. Cryptography and security change when a new attack is found. External protocols and APIs change when their owners decide. File formats of an ecosystem, such as a lockfile or a package manifest, change with the tools that write them. My environment being fixed does not help here, because the change comes from outside it, and I would have to notice it before it breaks me. This is the case where upkeep by people who watch that world full time is worth the most, and it is why I never hand-parse an ecosystem's formats in my repositories.

## Where I am now

The line I draw today is to build the inside myself and to use libraries at the boundaries. I do not consider this settled. Libraries still bring things I have not weighed here, and the balance may move again as models improve. For now, when I reach for a library, I ask whether the code sits at a boundary with the outside world. If it does not, I build it myself.
