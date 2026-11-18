# @masseater.dev/component-release

This workspace holds the helpers that app release builds share: `bundle-collect`, which copies Tauri bundles into `release-assets/`, `with-cuda`, which fetches a pinned CUDA toolkit from NVIDIA's redistributable archives into `target/cuda/`, copies its runtime libraries for bundling and runs a build command with the toolkit on `PATH`, and the command runners. Publishing itself goes through `msch-publish` and the publish workflow.
