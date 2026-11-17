# @r_masseater/msch

This workspace is `msch`, the owner's check policy. It finds problems in a repository (for example, the same set of values written twice) and provides the shared oxlint settings.

Some packages are useful on their own in repositories that do not use msch: vite-plus-adopt, the lint rule packages (oxlint-typed-rules and oxlint-plugin-decision) and the textlint rule preset. Keep publishing them to npm as separate packages.

msch depends on these packages and applies them itself. A repository with msch gets these rules and checks through msch alone.

In a repository with msch, do not use these packages directly anywhere else: do not list them in package.json, import them or configure them in vite.config.ts. msch checks this and reports every direct use. The packages msch applies are the @r_masseater packages in msch's dependencies.
