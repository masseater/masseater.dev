---
name: publishing
description: >
  Use in a repository that depends on @r_masseater/msch when releasing a workspace: publishing an
  npm package, shipping an app's installers as a GitHub Release, bumping a version, or adding a
  release build to a workspace. msch-publish is the one release path for both.
metadata:
  type: core
  library: "@r_masseater/msch"
  library_version: 0.43.0
sources:
  - bin/msch-publish.ts
  - src/features/publish-workspace/**
---

# publishing

Every release is manual. Nothing publishes on a push to main, and msch reports release-please and any workflow that runs `msch-publish` from another trigger.

## Release a workspace

1. Bump `version` in the workspace's `package.json` in a PR. When the workspace has a `Cargo.toml` or `src-tauri/Cargo.toml`, bump its version too; msch reports a mismatch.
2. Merge the PR.
3. Dispatch the `publish` workflow on main with the workspace directory, such as `libs/y8` or `apps/yakusu`.

A version that is already on npm or already has a GitHub Release with assets is skipped, so dispatching twice is safe. A package whose `workspace:` dependencies are not on npm at their current versions is refused; publish those first.

## What the workspace declares

`msch-publish plan <directory>` reads the workspace and decides what to publish.

| Declaration                                               | Result                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `package.json` without `private: true`                    | Builds, tests and publishes to npm with Trusted Publishing            |
| `native.binary` and `native.targets`                      | Builds each target on its OS and publishes one npm package per target |
| `release:linux`, `release:windows`, `release:macos` tasks | Builds on that OS; the task leaves its files in `release-assets/`     |
| `release:check:<os>` tasks                                | Checks the built files on that OS before anything is published        |
| `release:publish` task                                    | Runs after the GitHub Release exists, with the tag in `RELEASE_TAG`   |

The tag is the package name without its scope, then `-v` and the version. The repository root (`.`) is tagged `v` and the version, and always gets a GitHub Release with generated notes, marked latest, even without assets; a template repository releases this way. Release builds run in the GitHub environment `<name>-release`, which holds signing keys. A workspace at version `0.0.0` only builds; it publishes nothing.

## The workflow

The `publish` workflow runs `msch-publish plan`, the builds and checks the plan lists, `msch-publish npm` in the `npm` environment, and `msch-publish release`, which tags the commit and uploads `release-assets/`. Runs for the same workspace are serialized and never cancelled; different workspaces publish independently.
