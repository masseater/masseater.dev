# @masseater.dev/cargo-tools

This workspace builds the Rust command-line tools that tasks in this repository run, such as `clap-validator` and `gungraun-runner`. They are the dependencies of the crate in `Cargo.toml`, and `bin/build.ts` builds every one of them in release mode.

To add a tool, add it as a dependency in `Cargo.toml` with its version or tag pinned, and keep `Cargo.lock` committed. The build uses `--locked`.

`src/lib.rs` is empty. The crate exists only to pin and build the tools, so do not add logic to it.
