# @r_masseater/watashi

The command-line client of [watashi](https://watashi.masseater.dev). watashi is
the owner's personal data service. A Stop hook sends Claude Code transcripts to
it. Secrets are masked on the local machine first, with
[Betterleaks](https://github.com/betterleaks/betterleaks). The client also signs
in and manages API tokens.

It needs Node.js 26 or later. It also needs Betterleaks 2.0.0-rc.7, found
through `mise`, on `PATH`, or at the path in `WATASHI_BETTERLEAKS`. The package
is one bundled file with no runtime dependencies.

## As a Claude Code plugin

The package is also the Claude Code plugin `watashi` in the
[masseater/skills](https://github.com/masseater/skills) marketplace. The plugin
runs `watashi hook stop` when a session stops.

```sh
/plugin marketplace add masseater/skills
/plugin install watashi@masseater
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
