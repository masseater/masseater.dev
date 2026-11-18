---
name: suggest-workspaces
description: >
  Use when the @r_masseater/kogane Claude Code plugin adds a "kogane:" list of existing workspaces
  to a prompt, when installing or troubleshooting that plugin, or when writing the package.json
  description that kogane matches prompts against.
metadata:
  type: core
  library: "@r_masseater/kogane"
  library_version: 0.1.0
sources:
  - src/**
  - hooks/**
  - .claude-plugin/**
  - README.md
---

# suggest-workspaces

kogane adds a short list of existing workspaces to a prompt when their `package.json` `description` is close to what the prompt asks for.
The list starts with `kogane:` and names each workspace with its absolute directory.

## Act on a suggestion

1. Read the suggested workspace's AGENTS.md or README before writing new code for the task.
2. Use or extend that workspace when it covers the task.
3. Do not say a tool does not exist while a suggested workspace may provide it.

A suggestion is a lead, not a verdict. When a suggested workspace does not fit, carry on without it.

## Write descriptions kogane can match

kogane compares the prompt only with the `description` field.
Write it as one sentence that says what the workspace does, in the words someone asking for it would use.
A workspace without a description is never suggested.

## Install

```sh
claude plugin marketplace add masseater/masseater.dev
claude plugin install kogane@masseater-dev
```

The first prompt starts the background server and gets no suggestion.
The server downloads the model (about 200 MB) once and keeps it loaded, using about 1 GB of memory, until 30 minutes pass without prompts.

## Troubleshoot

- No suggestion ever appears: check that `$CLAUDE_PLUGIN_DATA/endpoint.json` exists after the first prompt. `kogane serve --data <dir>` run by hand shows why the server stops.
- A workspace is never suggested: run `kogane index` in the repository and check that it is listed with its description.
