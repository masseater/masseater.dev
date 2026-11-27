# fushi

This workspace is the desktop app fushi. The owner groups songs into styles and imports Ableton Live Sets and MIDI files into a style as .fumx. The app finds the chord changes that the songs share and a baseline rarely makes. The owner judges each one, and the kept ones become rules grouped by aim. A style exports as a `StyleRules` JSON file that i68-presets `styleRules` turns into an i68 preset.

The analysis runs in the screen with song-format and i68-presets. The Rust side keeps the library as `library.json` in the app's local data and reads the Chordonomicon genre tables that i68-presets builds. Do not put songs, the tables or the library in this repository or the installer.

The screens are served by tauri-plugin-localhost from a free port on `http://127.0.0.1`. When you add a command, add it to `src-tauri/build.rs` and `capabilities/default.json`. Then regenerate the bindings with `UPDATE_BINDINGS=1 cargo test -p fushi`.
