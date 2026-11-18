---
title: "syncpack: aligning dependency versions across package.json files in a monorepo"
description: "The results of running syncpack's lint and fix, banning dependencies and migrating automatically to the pnpm catalog with Version Groups, and specifying ranges with Semver Groups."
tags: ["syncpack", "pnpm", "monorepo"]
published: true
---

In a monorepo, mismatches such as `packages/web` having react 19.1.0 while `packages/api` has react 18.3.1 tend to stay unnoticed by anyone. [syncpack](https://syncpack.dev/) is a CLI that reads every `package.json` in the workspace, reports the places where the versions of the same dependency disagree, and fixes them[^syncpack-readme]. As an npm package, it ships native binaries for each OS through optionalDependencies, and the current version is 15.3.3[^npm-syncpack-www-npmjs-com-package-syncpack].

| Command  | What it does                                                             |
| -------- | ------------------------------------------------------------------------ |
| `lint`   | Reports mismatches in versions and ranges, and returns exit code 0 or 1  |
| `fix`    | Rewrites the problems reported by `lint` that can be fixed automatically |
| `update` | Updates to the latest versions on the npm registry                       |
| `format` | Aligns the order of fields in `package.json`                             |
| `list`   | Lists dependencies, split into valid and invalid ones                    |
| `json`   | Outputs one line of JSON for each instance of a dependency               |

## Detecting and fixing mismatches

We run `lint` in a state where two packages have react, zod and typescript at different versions.

```text
$ syncpack lint
= Default Version Group ========================================================
   2x react
      ✘ 18.3.1 → 19.1.0 in packages/api/package.json at .dependencies (DiffersToHighestOrLowestSemver)
   3x typescript
      ✘ ^5.8.0 → 5.9.3 in packages/web/package.json at .devDependencies (DiffersToHighestOrLowestSemver)
   2x zod
      ✘ ^3.24.0 → ^3.25.0 in packages/api/package.json at .dependencies (DiffersToHighestOrLowestSemver)
✗ Issues found
```

The default policy is to align to the highest semver found. The `DiffersToHighestOrLowestSemver` at the end is the status code for a violation of that policy. Running `fix` reverses the direction of the arrows and rewrites each `package.json`.

```text
$ syncpack fix
   2x react
      ✓ 19.1.0 ← 18.3.1 in packages/api/package.json at .dependencies
```

## Splitting policies with Version Groups

When you split dependencies into Version Groups, each group can have its own policy. The settings go in `.syncpackrc.json` or `syncpack.config.ts`, and with TypeScript you can use the type `import("syncpack").RcFile`[^syncpack-config-file].

| Policy                  | Behavior                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| Highest / Lowest Semver | Aligns to the highest or lowest version found                           |
| Pinned                  | Pins to the version written in `pinVersion`                             |
| Snapped To              | Matches the others to the version a specified package has               |
| Same Range              | Does not align versions, and allows them if their semver ranges overlap |
| Banned                  | Bans the use of that dependency                                         |
| Catalog                 | Enforces references from the pnpm or Bun catalog                        |
| Ignored                 | Excludes from the checks                                                |

The source is the list of Version Groups[^syncpack-version-groups]. Groups are matched from top to bottom, and a dependency belongs only to the first group it matches.

### Banned

To unify HTTP clients on fetch, we ban axios. The sentence written in `label` becomes the heading of the output as it is.

```json
{
  "versionGroups": [
    {
      "label": "HTTP クライアントは fetch を使う",
      "dependencies": ["axios", "ky", "got"],
      "isBanned": true
    }
  ]
}
```

```text
$ syncpack lint
= HTTP クライアントは fetch を使う ===================================
   1x axios
      ✘ 1.7.0 →  in packages/web/package.json at .dependencies (IsBanned)
```

`IsBanned` is a target of automatic fixing, so running `fix` deletes the `axios` line from `package.json`[^syncpack-banned-version-groups]. If you write the reason for the ban in `label`, the CI failure log explains itself.

### Catalog

[The pnpm catalog](https://pnpm.io/catalogs) is a mechanism where versions are written in one place, `pnpm-workspace.yaml`, and each `package.json` refers to them with `catalog:`. To move an existing repository to the catalog, create a group with `policy: "catalog"`.

```json
{
  "versionGroups": [
    { "label": "本番の依存は catalog から取る", "dependencyTypes": ["prod"], "policy": "catalog" }
  ]
}
```

```text
$ syncpack lint
= 本番の依存は catalog から取る ======================================
   2x react
      ✘ 19.1.0 → catalog: in packages/api/package.json at .dependencies (MissingFromCatalog)
      ✘ 19.1.0 → catalog: in packages/web/package.json at .dependencies (MissingFromCatalog)
```

Running `fix` adds a `catalog:` section to `pnpm-workspace.yaml`, moves the versions there, and replaces them in `package.json` with `"react": "catalog:"`[^syncpack-catalog-version-groups].

```yaml
packages:
  - packages/*
catalog:
  react: 19.1.0
  zod: ^3.25.0
```

After moving to the catalog, version updates can target only the catalog entries with `syncpack update --dependency-types pnpmCatalog`[^syncpack-readme].

## Deciding how ranges are written with Semver Groups

Semver Groups decide not the versions themselves but how `^` and `~` are attached. You specify a range for each type of dependency, such as pinned for production dependencies, `~` for devDependencies and `^` for peerDependencies[^syncpack-semver-groups].

```json
{
  "semverGroups": [
    { "dependencyTypes": ["prod"], "range": "" },
    { "dependencyTypes": ["dev"], "range": "~" },
    { "dependencyTypes": ["peer"], "range": "^" }
  ]
}
```

[^syncpack-readme]: syncpack README. https://github.com/JamieMason/syncpack

[^npm-syncpack-www-npmjs-com-package-syncpack]: npm の syncpack パッケージ。 https://www.npmjs.com/package/syncpack

[^syncpack-config-file]: Syncpack - Config File. https://syncpack.dev/config/syncpackrc

[^syncpack-version-groups]: Syncpack - Version Groups. https://syncpack.dev/version-groups/

[^syncpack-banned-version-groups]: Syncpack - Banned Version Groups. https://syncpack.dev/version-groups/banned/

[^syncpack-catalog-version-groups]: Syncpack - Catalog Version Groups. https://syncpack.dev/version-groups/catalog/

[^syncpack-semver-groups]: Syncpack - Semver Groups. https://syncpack.dev/semver-groups/
