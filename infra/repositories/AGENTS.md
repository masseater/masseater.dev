# @masseater.dev/repositories

This workspace manages the owner's GitHub account and repositories. It also holds the broker that hands tokens to CI and agents.

- Do not change whether a repository is public or private.
- To delete a repository, run the `task` workflow on main by hand with the `delete-repositories` task and the `github` credentials.
- To delete a Worker that no stack owns, run the `task` workflow on main by hand with the `delete-workers` task, the `root` credentials and `WORKERS=<name>` in the settings.
- To check that the AI Gateway spend limit really blocks with 429, run the `task` workflow on main by hand with the `verify-gateway-cap` task and the `repository` credentials, which the `task` environment grants AI Gateway Write. It creates the gateway `cap-check` with a tiny limit, calls Workers AI through it until a 429 comes back, and deletes the gateway.
- Renaming `SealKey` or removing it from the state recreates the key, and the stored values can no longer be read. Then import the App key and the Bluesky app password again.
- The host that agents reach over the tailnet is written only in the Tailscale policy file, as the destination of the grant from `tag:agent`. The stack keeps that grant and fails when it is missing. Do not write the address in this repository.
