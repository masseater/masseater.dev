# @masseater.dev/repositories

This workspace manages the owner's GitHub account and repositories. It also holds the broker that hands tokens to CI and agents.

- Do not change whether a repository is public or private.
- To delete a repository, run the `task` workflow on main by hand with the `delete-repositories` task and the `github` credentials.
- Renaming `SealKey` or removing it from the state recreates the key, and the stored values can no longer be read. Then import the App key and the Bluesky app password again.
