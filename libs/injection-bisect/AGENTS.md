# @r_masseater/injection-bisect

This workspace is `injection-bisect`. It finds whether and where a prompt injection hides in a document by asking a cheap decision model about small parts.

Add a new input format as a `Parser`. Read the format with an existing library instead of writing your own reader.
For models under `respan/`, do not put several spans' questions in one request, and do not use multiple-choice questions.
Before changing the default model `respan/span-01-lite`, measure again and ask the user.
Compare accuracy, cost and time against frontier models that judge directly, on both harmless inputs and inputs with injections. Check the OpenRouter key balance before and after measuring.
