# lap

This workspace runs a command with an OpenTelemetry Collector beside it, the way setup does in CI: `lap <name> -- <command> [args]`. The Collector writes OTLP to files in `~/.cache/lap/<time>-<name>/`: the spans of tools that read `OTEL_*` (msch), the CPU, memory, disk space and network traffic of the machine every 5 seconds, and one span for the command itself. `output.log` keeps the output with a timestamp on every line, and `vp-summary.json` keeps what vp says about each task. The git hooks and a manual `vp install` run through it. `work-metrics spans --dir ~/.cache/lap/<run>` reads a run.

The command runs even if the Collector cannot start, and lap says so on stderr. A hook never fails because of measurement.
