# @r_masseater/kogane

A Claude Code plugin that tells the agent which workspaces of the current pnpm monorepo may already do what a prompt asks for. It exists because agents keep rebuilding tools that are already in the repository, or say a tool does not exist after searching only npm.

On every prompt, the `UserPromptSubmit` hook compares the prompt with the `description` of each workspace and adds the close matches to the context:

```text
kogane: these existing workspaces may already do what this prompt needs. Read their AGENTS.md or README before building something new or saying it does not exist.
- @masseater.dev/effect2rs (/home/user/masseater.dev/libs/effect2rs): Generates serde Rust types from Effect Schema by walking SchemaRepresentation.
```

Nothing leaves the machine. The prompt and the descriptions are embedded with [EmbeddingGemma 2](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX) (q4, pinned revision) on the CPU.

## Install

The plugin is listed in the marketplace of [masseater/masseater.dev](https://github.com/masseater/masseater.dev):

```sh
claude plugin marketplace add masseater/masseater.dev
claude plugin install kogane@masseater-dev
```

## How it behaves

- Workspaces come from `pnpm-workspace.yaml` of the monorepo that contains the session's working directory. When the working directory is not inside one, every direct subdirectory that is a pnpm monorepo is used, which covers sessions that hold several repositories.
- Only workspaces with a non-empty `description` in `package.json` are considered.
- At most three workspaces are suggested, and only those scoring at least 0.69 and within 0.06 of the best match. Most prompts get no suggestion.
- The first prompt starts a background server (`kogane serve`) and gets no suggestion. The server keeps the model loaded, which takes about 1 GB of memory, and exits after 30 minutes without prompts. The first download of the model is about 200 MB.
- The hook gives up after 3 seconds, so a slow answer never blocks the prompt.
- Data and the model cache go to `$CLAUDE_PLUGIN_DATA`, or `~/.cache/kogane` outside the plugin.

## Commands

| Command                            | What it does                                                           |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `kogane hook`                      | Runs as the `UserPromptSubmit` hook (reads the hook input from stdin). |
| `kogane serve --data <dir>`        | Runs the background server. The hook starts it.                        |
| `kogane index [--directory <dir>]` | Prints every workspace with its description as Markdown.               |

## License

MIT
