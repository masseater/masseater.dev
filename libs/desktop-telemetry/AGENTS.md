# @masseater.dev/desktop-telemetry

This workspace starts the OpenTelemetry Browser SDK in the screen of a Tauri desktop app built on desktop-shell. Call `startScreenTelemetry` with the screen's service name before the app renders. It records page loads, navigations, clicks, every `fetch` including Tauri IPC calls, Web Vitals, long animation frames and unhandled errors, and sends them to desktop-shell's `otlp` scheme, which writes `telemetry/traces.jsonl` and `telemetry/logs.jsonl` in the app's log folder. The app's `connect-src` needs `otlp: http://otlp.localhost`.

The SDK's own exporter settings accept only http and https URLs, and the `otlp` scheme is `otlp://localhost` outside Windows, so the exporters are passed as processors.
