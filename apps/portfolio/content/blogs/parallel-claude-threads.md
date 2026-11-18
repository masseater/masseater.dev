---
title: "Running dozens of Claude threads at once"
description: "I run my personal development as one claude.ai project with dozens of Claude threads working in parallel. A coordinator routes my requests, and an hourly audit thread finds stalled threads and PRs, proposes merging duplicate threads and redraws the task graph."
tags: ["Claude", "AI agents", "Automation"]
published: true
---

I build almost everything I make by myself through Claude threads in one claude.ai project. On November 17 (JST), about 40 new threads started in that project, and 194 pull requests were merged across my repositories. Of those, 118 were written by Claude under my account, 60 came from Renovate and 16 were release PRs from a bot. Since the project started, it has created 412 threads, and at 10:55 on November 18, 13 of them were still open. The limit at this scale is my attention, not Claude's speed. Everything below exists so that I can keep giving instructions while reading only one place.

## I read only the project chat

I read only the project chat, and I never open the threads. A claude.ai project has a coordinator, a Claude that talks with me in the project chat, and each piece of work gets its own thread. When I write "build this" in the project chat, the coordinator starts a thread and passes my message to it. The thread does the work, opens a PR and merges it once its checks pass, because I no longer review PRs before they merge (I wrote why in [I stopped reviewing PRs](/blogs/stop-pr-review)).

The project instructions say that the coordinator copies into the project chat, in one line with a link, anything a thread needs from me: manual work, a look at a screen, a permission prompt or a decision. Finished work comes back the same way, with the PR or the public URL. My replies in the chat go back to the right thread through the coordinator. A thread therefore writes its request to me on the assumption that I will never come to read it.

## A thread that stops looks the same as a thread that works

With dozens of threads running, I cannot notice by myself that one has stopped. A thread waiting on a CI result, a thread waiting on me and a thread whose session died all look like silence in the project chat. Conflicts make this worse: when one PR merges, the PRs of other threads in the same repository fall behind main and conflict, and nobody fixes them unless the owning thread notices.

The second problem is threads that split the same work. When I ask for related things in separate messages, the coordinator sometimes starts a new thread for each. Two threads then edit the same files, open competing PRs and ask me the same question twice.

## The audit started as hourly scheduled tasks

On November 15, I first solved this with scheduled tasks. One task, run every hour, checked unmerged PRs and stalled threads, and another, at 52 minutes past every hour, told the coordinator to regroup duplicate threads. I asked for them to stay simple: they were to give instructions, not to investigate. Each run started a new thread, posted its result and closed itself.

This produced many threads that I could not follow. Every hour added two more short-lived threads to the list, and when a task was recreated without deleting the old one, three audit threads started in the same minute. I also could not see what the coordinator did with the instructions, because that loop ran inside its own session.

## One audit thread that never closes

On November 16, I replaced the scheduled tasks with one thread that audits every hour and is never resolved. At the end of each run, it schedules its own next run in the same thread. It reads only the thread list, the latest message of each stalled thread and my open PRs with their CI state and mergeability. It posts its result in Japanese, in at most 1,500 characters, even when nothing is wrong, so I can scroll back through every run in one place.

My first instructions told it both "do not dig into stalled threads" and "find out why they stalled," and I pointed out that the two contradict each other. The rule became that the audit writes the reason if the reason is visible and otherwise asks the coordinator to find it and restart the thread. The audit never messages other threads directly. It sends everything to the coordinator, which batches the restarts, merges every open PR and consolidates duplicate threads. A thread that is absorbed hands over its state before it is resolved.

| What the audit counts                       | 24 runs from 10:42 on Nov 17 to 10:01 on Nov 18 (JST) |
| ------------------------------------------- | ----------------------------------------------------- |
| Times a thread or PR was flagged as stalled | 23                                                    |
| Merges it saw since the previous run        | 47                                                    |
| Thread consolidations it proposed           | 5                                                     |

The flags are often about something outside any one thread. At 15:52 on November 17, the audit reported that the package registry that blocks malicious npm packages was returning HTTP 429 to anonymous CI installs, which stopped CI in every repository at once. A PR that stayed in conflict for 2.9 hours was flagged the same way.

## The task graph shows only what I must decide

At the end of every run, the audit also rewrites the task graph. It is a page that reads a JSON file in the project's shared folder and lays out tasks from left to right along their dependencies. Each task has a status, the threads working on it and its PRs, and every task flows into one of four goals, such as "every rule of the repositories lives in msch." At the last update there were 51 tasks, 36 of them done.

The coordinator adds a task when it starts a thread, and when several threads do the same work it merges them into one task. A task that needs my choice gets its own card with two to four options, each drawn as a small diagram of what the repositories look like after I pick it. I answer on the page, and the coordinator forwards my answer to the thread. A choice on that page is never taken as my approval for a merge or a deletion.

The page is my third attempt. On November 14, I threw away a status page with a one-word reply: "いらね." The second, a kanban board of what waits on me, what is running and what finished in the last 24 hours, was replaced by the graph on the day I approved it.
