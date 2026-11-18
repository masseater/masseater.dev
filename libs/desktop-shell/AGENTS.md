# @masseater.dev/desktop-shell

This workspace holds the window and app behavior shared by the Tauri desktop apps.

It also holds the access token the desktop apps share to serve MCP on the user's own PC, and the local MCP server behind a bearer token.

Every app built on it records traces in `telemetry/traces.jsonl` in the app's log folder, one OTLP JSON batch per line, the format the OpenTelemetry Collector file exporter writes. Tauri's own tracing gives a span for each IPC command, window and protocol request without code in the app. Spans from the app's code at info level and above go to the same file. The screen sends its spans as OTLP/HTTP JSON to `otlp://localhost/v1/traces` (`http://otlp.localhost/v1/traces` on Windows), which also needs `otlp: http://otlp.localhost` in the app's `connect-src`. When the file passes 64 MiB, the next start moves it to `traces.1.jsonl`.

Apps check for an update when they start. When one is found, they download it, ask the user, then install it and restart. Each app needs `plugins.updater` in `tauri.conf.json` with its public key and the feed `https://github.com/masseater/masseater.dev/releases/download/<name>-updater/latest.json`, plus `createUpdaterArtifacts` in `tauri.release.conf.json`. The `updater-key` task makes the signing key in the `<name>-release` environment and prints the public key. Publishing then writes the feed with `updater-feed`.
