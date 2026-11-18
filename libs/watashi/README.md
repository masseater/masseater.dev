# @r_masseater/watashi

The command-line client of [watashi](https://watashi.masseater.dev). watashi is
the owner's personal data service.

A Stop hook sends Claude Code transcripts to
it. Secrets are masked on the local machine first, with
[h56m](https://www.npmjs.com/package/@r_masseater/h56m). The client also signs
in and manages API tokens.

It needs Node.js 26 or later. The package is one bundled file whose only
runtime dependency is the native addon of h56m.

## Agent skills

Guidance for agents ships in the package as TanStack Intent skills. Load one with `vp exec intent load @r_masseater/watashi#<skill>`.

| Skill                | When to use                                                           |
| -------------------- | --------------------------------------------------------------------- |
| `send-conversations` | Sending Claude Code transcripts to watashi with the CLI or the plugin |

## As a Claude Code plugin

The package is also the Claude Code plugin `watashi` in the
[masseater/masseater.dev](https://github.com/masseater/masseater.dev) marketplace. The plugin
runs `watashi hook stop` when a session stops.

```sh
/plugin marketplace add masseater/masseater.dev
/plugin install watashi@masseater-dev
```

The hook sends nothing unless `WATASHI_SEND_CONVERSATIONS=1` is set.

## As a command

```sh
npx @r_masseater/watashi login
npx @r_masseater/watashi token issue --scope conversation:write --label cloud
npx @r_masseater/watashi conversation push --kind claude-code --session <id> <transcript.jsonl>
npx @r_masseater/watashi mask < transcript.jsonl
```

A cloud session has no browser. There, issue a long-lived token on a
machine that is signed in, and set it as `WATASHI_TOKEN`.

## License

AGPL-3.0-only
