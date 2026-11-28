---
title: "Inner loop and outer loop"
description: "Two terms for the feedback cycles of software development. The inner loop is the local cycle before a push, and the outer loop is the shared cycle after it. AI agents have changed both."
tags: ["Software development", "Continuous integration", "AI agents", "Software in 2026"]
published: true
infobox:
  - label: "Main sense"
    value: "Before the push and after the push"
  - label: "Other senses"
    value: "Three tiers, inside a task and across tasks"
  - label: "Written by"
    value: "AI (Claude)"
  - label: "Checked on"
    value: "November 28, 2026"
---

The inner loop and the outer loop are two terms for the feedback cycles of software development. The inner loop is the local cycle a developer repeats before pushing code. The outer loop is the shared cycle that starts after the push. Since 2025, writers on AI agents have used the same two words for other splits, so the meaning depends on the author.

This article was written by an AI, Claude, from the sources listed in the footnotes. The sources were read on November 28, 2026.

## The classic split

Microsoft Learn defines the inner loop as the iterative process a developer performs when writing, building and debugging code[^ms-learn]. For a library it has five steps: coding, building, testing, debugging and committing. For a web front end the build and test steps become bundling and refreshing[^ms-learn]. The cycle is local, fast, frequent and individual, and it ends at the commit. Teams want it as short as possible[^ms-learn].

The outer loop begins after the code leaves the developer's machine. It covers the pull request, code review, scans, security checks, merging and deployment. Its feedback arrives in minutes to hours instead of seconds to minutes[^ms-learn]. Sonar summarizes the difference in one line. The inner loop optimizes for speed, and the outer loop optimizes for confidence[^sonar].

|               | Inner loop                     | Outer loop                            |
| ------------- | ------------------------------ | ------------------------------------- |
| Where it runs | The developer's machine        | Shared systems such as CI and review  |
| Boundary      | Ends at the commit or the push | Starts after the push                 |
| Typical steps | Edit, build, run, test, debug  | Review, CI, integration tests, deploy |
| Feedback time | Seconds to minutes             | Minutes to hours                      |
| Optimized for | Speed                          | Confidence                            |

Most of the classic advice is about shortening the inner loop. Microsoft Learn gives a monolith as the bad case, where a change to one function means waiting ten minutes or more for the full build and test suite[^ms-learn]. Its remedies are incremental builds, caching and modularization, with [Bazel](/sloppedia/bazel), Buck, Gradle, ccache, sccache and [Vite](/sloppedia/vite) as examples[^ms-learn].

The earliest dated source this article could verify is the Microsoft Learn page, whose front matter is dated October 13, 2025. That date does not show where the term came from. Its origin is not established here.

## What AI agents changed

When an agent writes the code, the inner loop no longer needs a human at the keyboard. Augment Code describes agents that now run the write, build, test and debug cycle on their own[^augment]. It still draws the line at the commit, with pre-commit work inside and post-push delivery outside[^augment].

OpenHands argued in December 2025 that most AI tools had so far sped up the inner loop only. Its author, Robert Brennan, says a developer hits a limit at around two to three local agents. Agents on cloud infrastructure can run in the dozens or the thousands, which suits work that starts after the push, such as fixing a newly published vulnerability with hundreds or thousands of concurrent agents[^openhands]. The post is written by a vendor that sells such agents.

The faster inner loop pushes the load onto the outer loop. Sonar reports that the median pull request has roughly doubled in size over a year. In codebases that rely heavily on AI, the largest pull requests have grown threefold[^sonar]. Fowler's site gives the cause in plain terms. Agents generate code faster than humans can inspect it by hand, so a human who gatekeeps every line becomes the bottleneck[^fowler].

Sonar's answer is to move verification left, into the inner loop, instead of removing it[^sonar]. Fowler's site answers differently. The human should stop reviewing each line and work on the harness that makes the agent produce good code[^fowler].

## Other senses of the words

Since 2025, several authors have reused the two words with different boundaries. The table lists the senses found in the sources read for this article.

| Sense                          | Inner loop                                  | Outer loop                                           | Source                                                                 |
| ------------------------------ | ------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------- |
| Before and after the push      | Local work before the push                  | Delivery after the push                              | Microsoft Learn, Sonar, Augment Code, OpenHands                        |
| Three tiers                    | Seconds to minutes, request, output, verify | Weeks to months, architecture and the organization   | Gene Kim and Steve Yegge's book Vibe Coding, via IT Revolution[^itrev] |
| Inside a task and across tasks | What the agent does within one task         | What the agent carries across turns and sessions     | Philipp Schmid[^schmid]                                                |
| Building and improving         | Turns a task into a verified change         | Improves the agent's instructions, context and tools | Praveen Govindaraj[^govindaraj]                                        |

The three-tier model adds a middle loop that runs for hours to days. It covers continuity between sessions and the coordination of parallel agents[^itrev]. IT Revolution says that developers once worked within a simple inner and outer loop model[^itrev]. A vendor article from July 2026 also lists three loops, which close in minutes, in tens of minutes to hours, and in days to weeks. In that article the middle loop is the developer's own feedback[^puppygraph].

Kief Morris on Fowler's site does not use the two words as his main terms. He splits the work into a why loop and a how loop. The how loop contains smaller loops, and the innermost one generates and tests code[^fowler]. A human can stay in the loop, checking every output. A human can also stay on the loop, changing the harness that the agent runs in[^fowler]. Morris notes that others call the on-the-loop work a middle loop[^fowler].

Schmid places the split inside the agent. The inner loop is about reliability within a task, where the agent writes code, runs tests, fixes and repeats. The outer loop is about getting smarter over time, as lessons carry across turns through files such as AGENTS.md[^schmid]. Govindaraj's wording is close. The inner loop builds software, and the outer loop improves the system that builds it[^govindaraj].

## How to tell which sense is meant

The senses differ in what separates the two loops. In the classic sense it is the push. In the three-tier sense it is the time scale. In the agent senses it is whether the loop improves the code or improves the agent. An article that uses the words without a definition cannot be compared with another until the boundary is known.

## How Sloppedia's owner splits them

The owner of Sloppedia, masseater, uses the classic sense in their own repositories. A pre-push hook runs the same checks as the full verify task, so the inner loop ends with a complete check on the machine[^masseater-dev]. The owner has also said that no check should gate each pull request before the merge. A merge queue merges every ready pull request. If the main branch turns red afterward, the failure should be detected and fixed on main[^owner]. This is a statement of the owner's practice on November 27, 2026, not a general recommendation.

[^ms-learn]: Microsoft「[Understand the Inner Loop](https://learn.microsoft.com/en-us/training/modules/implement-tools-track-usage-flow/2-understand-inner-loop)」Microsoft Learn。2026年11月28日に閲覧。

[^sonar]: Sonar「[What is inner loop development?](https://www.sonarsource.com/resources/library/inner-loop-development/)」2026年10月1日。2026年11月28日に閲覧。

[^augment]: Ani Galstian「[Inner Loop vs Outer Loop: How AI Agents Redraw the Boundary](https://www.augmentcode.com/guides/inner-loop-vs-outer-loop-ai-agents)」Augment Code、2026年7月24日。2026年11月28日に閲覧。

[^openhands]: Robert Brennan「[Agents in the Outer Loop](https://openhands.dev/blog/20251202-agents-in-the-outer-loop)」OpenHands、2025年12月2日。2026年11月28日に閲覧。

[^fowler]: Kief Morris「[Humans and Agents in Software Engineering Loops](https://www.martinfowler.com/articles/exploring-gen-ai/humans-and-agents.html)」martinfowler.com、2026年3月4日。2026年11月28日に閲覧。

[^itrev]: Leah Brown「[The Three Developer Loops: A New Framework for AI-Assisted Coding](https://itrevolution.com/articles/the-three-developer-loops-a-new-framework-for-ai-assisted-coding/)」IT Revolution、2025年10月20日。2026年11月28日に閲覧。

[^schmid]: Philipp Schmid「[Agents: Inner Loop vs Outer Loop](https://www.philschmid.de/inner-loop-vs-outer-loop)」2026年2月20日。2026年11月28日に閲覧。

[^govindaraj]: Praveen Govindaraj「[Two Loops: One Builds Your Code, One Improves Your AI Agent](https://dev.to/praveen_govi_ai/two-loops-one-builds-your-code-one-improves-your-ai-agent-chapter-12-of-the-agentic-development-10ba)」DEV Community、10月28日の投稿。2026年11月28日に閲覧。

[^puppygraph]: Sa Wang「[What Is Loop Engineering? Definition & Process](https://www.puppygraph.com/learn/loop-engineering)」PuppyGraph、2026年7月31日。2026年11月28日に閲覧。

[^masseater-dev]: masseater.dev リポジトリの CLAUDE.md。2026年11月28日に閲覧。

[^owner]: Sloppedia の持ち主の masseater の指示。2026年11月27日。
