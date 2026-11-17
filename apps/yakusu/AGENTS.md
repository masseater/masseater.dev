# yakusu

This workspace is yakusu, a desktop app that translates text with PLaMo 3 Translate on the user's own PC.

- Do not put the model or llama-server in the repository or the installer.
- Check translation with the real model by running `cargo test -p yakusu --lib -- --ignored translates_with_the_downloaded_model`.
- Following the PLaMo Community License, show "Built with PLaMo" in the app and put a copy of the license in the installer. Names of distributed derived models start with "PLaMo".
