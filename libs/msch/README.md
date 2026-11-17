# @r_masseater/msch

msch packages the check policy shared across masseater's repositories. It requires Vite+ and Node.js 26 or later.

```sh
vp add -D @r_masseater/msch
vp exec msch
```

Guidance for agents ships in the package as TanStack Intent skills. Load one with `vp exec intent load @r_masseater/msch#<skill>`.

| Skill                | When to use                                 |
| -------------------- | ------------------------------------------- |
| `msch-checks`        | Running msch and fixing what it reports     |
| `repository-config`  | Building the root `vite.config.ts`          |
| `workspace-settings` | Changing the settings of a single workspace |

The package has these entry points.

| Entry point                            | Contents                                                     |
| -------------------------------------- | ------------------------------------------------------------ |
| `msch` (bin)                           | Runs every check against the repository                      |
| `@r_masseater/msch/config`             | `repositoryConfig`, which builds the root `vite.config.ts`   |
| `@r_masseater/msch/workspace-settings` | `workspaceSettings`, which loads the settings of a workspace |
| `@r_masseater/msch/lint`               | The oxlint preset and rule sets                              |
| `@r_masseater/msch/oxlint`             | A JS plugin that reports msch findings as oxlint diagnostics |
| `@r_masseater/msch/decision-rules`     | The decision rule plugin that the preset loads               |

## Published to

- npm: [@r_masseater/msch](https://www.npmjs.com/package/@r_masseater/msch)
