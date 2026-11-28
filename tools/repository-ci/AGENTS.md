# @masseater.dev/repository-ci

Vite+ tasks that main's verify job uses to handle this repository's Actions caches, Issues for failed deploys, the set of stacks to deploy and their production deploys, and the zenn branch.

A stack counts as changed since its last deployment when a file under its packages or their workspace dependencies changed, or a shared file changed (`.github/actions/`, `patches/`, a root file other than Markdown, the lockfile and `pnpm-workspace.yaml`). `pnpm-lock.yaml` and `pnpm-workspace.yaml` are judged by what pnpm resolved instead: the lockfile at the last deployment and at HEAD are read with `@pnpm/lockfile.fs`, and the stack counts as changed only when the set of packages reachable from one of its importers differs, or when the lockfile's settings, overrides, patches or extensions differ. A bump of a root-only tool such as msch therefore deploys nothing. If either lockfile cannot be read, the stack counts as changed.
