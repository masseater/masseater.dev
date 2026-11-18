# @masseater.dev/desktop-shell

This workspace holds the window and app behavior shared by the Tauri desktop apps.

It also holds the access token the desktop apps share to serve MCP on the user's own PC, and the local MCP server behind a bearer token.

Every app built on it records traces in `telemetry/traces.jsonl` in the app's log folder, one OTLP JSON batch per line, the format the OpenTelemetry Collector file exporter writes. Tauri's own tracing gives a span for each IPC command, window and protocol request without code in the app. Spans from the app's code at info level and above go to the same file. The screen sends OTLP/HTTP JSON to `otlp://localhost/v1/traces` and `/v1/logs` (`http://otlp.localhost/...` on Windows), and screen logs go to `telemetry/logs.jsonl`. desktop-telemetry starts the sending in each screen. Every desktop app adds `telemetry_plugin()`, through `builder` or by hand. When a file passes 64 MiB, the next start moves it to `traces.1.jsonl` or `logs.1.jsonl`.
