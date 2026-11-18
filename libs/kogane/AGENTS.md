# @r_masseater/kogane

This workspace is the command and Claude Code plugin that suggests existing workspaces for each prompt. The plugin files (`.claude-plugin/`, `hooks/`) live here with the code they run, so a change to one ships with the other.

The hook must never hold up a prompt. It answers within a few seconds or says nothing; the server keeps EmbeddingGemma 2 loaded between prompts and stops after 30 idle minutes.
