# shirushi

This workspace is the desktop app shirushi. The owner plays songs and videos from YouTube, Niconico, SoundCloud and files on the PC that they use as references for their creative work, and marks the ranges they like or dislike. Marks are saved on the owner's PC. AIs that make songs, pictures or video read them through the MCP the app serves on `127.0.0.1`. Through the same MCP, the AI posts two-way choices, guesses about the owner's taste and predictions for songs and videos the owner has not seen, and reads the owner's answers.

Do not put other people's songs or videos, or stems and stills made from them, in this repository or the installer.

The screens are served by tauri-plugin-localhost from a free port on `http://127.0.0.1`, not from `tauri://localhost`. Screens on a custom scheme send no Referer, and YouTube embeds stop with Error 153. So when you add a command, also add it to `src-tauri/build.rs` and `capabilities/default.json`.
