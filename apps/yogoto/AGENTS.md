# yogoto

This workspace is the desktop app yogoto. The owner drops links or files of songs into it. The app keeps the original audio as it is, separates it into stems with BS-RoFormer models, and stores them in a library. AIs that work with songs or samples ask for imports and separations through the MCP the app serves on `127.0.0.1`, and read the resulting files.

Each song folder is `library/songs/<id>/` in the app's local data. It holds `song.json`, the original audio in `sources/`, and the stems in `stems/<separation id>/<stem>.flac`. Stems have the same sample rate and length as the original audio. The shape of `song.json` is defined by the Effect Schema in `libs/yogoto-protocol`.

Do not put other people's songs, or stems made from them, in this repository or the installer.

The screens are served by tauri-plugin-localhost from a free port on `http://127.0.0.1`. When you add a command, also add it to `src-tauri/build.rs` and `capabilities/default.json`. To separate on an NVIDIA GPU, build with the `cuda` feature.
