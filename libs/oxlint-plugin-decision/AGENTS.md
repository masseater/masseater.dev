# @r_masseater/oxlint-plugin-decision

This workspace is an oxlint plugin. It checks code against rules written in plain English and uses decision models to judge whether the code follows them.

Make no calls other than to decision models. The plugin calls only the Jev family through the Typesafe System One API and only the Clef family through Cloudflare Workers AI. Do not add chat models, chat completions or OpenAI-compatible endpoints, and do not ask chat models yes/no questions with logprobs.

When moving the plugin to another provider or platform, do not swap the model for another kind. If the platform has no decision model, ask the owner. Do not write the choice of models into skills or other repository documents. This rule lives in this file.
