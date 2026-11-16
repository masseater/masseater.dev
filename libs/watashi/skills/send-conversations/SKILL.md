---
name: send-conversations
description: >
  Use when sending Claude Code transcripts to watashi (watashi.masseater.dev) with the
  @r_masseater/watashi CLI or its Claude Code plugin: login, API tokens for cloud sessions, the Stop
  hook, conversation push, local secret masking with Betterleaks and the WATASHI_* variables.
metadata:
  type: core
  library: "@r_masseater/watashi"
  library_version: 0.1.1
sources:
  - src/app/**
  - hooks/**
  - .claude-plugin/**
  - README.md
---

# send-conversations

The `watashi` CLI masks secrets in a Claude Code transcript with Betterleaks on the local machine.
It then sends the transcript to watashi.
The Claude Code plugin `watashi` runs `watashi hook stop` when a session stops.

## Prerequisites

The CLI needs Node.js 26 or later and Betterleaks 2.0.0-rc.7.
It finds Betterleaks through `mise`, on `PATH`, or at the path in `WATASHI_BETTERLEAKS`.
Without Betterleaks the CLI refuses to send, so no unmasked text leaves the machine.

## Send every session automatically

1. Install the plugin from the masseater/skills marketplace.

   ```sh
   /plugin marketplace add masseater/skills
   /plugin install watashi@masseater
   ```

2. Set `WATASHI_SEND_CONVERSATIONS=1`. The hook sends nothing without it.
3. Sign in once with `npx @r_masseater/watashi login`. A machine with a browser does this.

## Cloud sessions

A cloud session has no browser, so it cannot run `login`. On a machine that is signed in, issue a long-lived token and set it as `WATASHI_TOKEN` in the cloud environment.

```sh
npx @r_masseater/watashi token issue --scope conversation:write --label cloud
```

`token list` shows the tokens and `token revoke <id>` removes one. The scopes are `conversation:write` and `memory:write`.

## Commands

| Command                                                                                | Does                                                       |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `login`, `logout`                                                                      | Signs in to watashi in the browser, or signs out           |
| `conversation push --kind claude-code --session <id> [--cwd <dir>] <transcript.jsonl>` | Masks and sends one transcript                             |
| `mask`                                                                                 | Prints stdin with secrets masked, without sending anything |
| `hook stop`                                                                            | What the plugin's Stop hook runs                           |

`WATASHI_URL` points the CLI at another watashi, and `WATASHI_HOME` moves its local state.

## Common mistakes

Keep the token in the environment's secrets, never in a repository or a transcript.
The hook sends nothing until `WATASHI_SEND_CONVERSATIONS=1` is set.
