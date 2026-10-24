---
title: "syncpack: monorepo の package.json の依存の版をそろえる"
description: "syncpack の lint と fix の実行結果、Version Groups による禁止と pnpm catalog への自動移行、Semver Groups による範囲の指定。"
tags: ["syncpack", "pnpm", "monorepo"]
published: true
---

monorepo では、`packages/web` が react 19.1.0 を、`packages/api` が react 18.3.1 を持つような不一致が、誰も気づかないまま残りやすい。[syncpack](https://syncpack.dev/) は、ワークスペース内のすべての `package.json` を読み、同じ依存の版が食い違っている箇所を報告して修正する CLI である[^syncpack-readme]。npm パッケージとしては OS ごとのネイティブバイナリが optionalDependencies で配布されていて、現在の版は 15.3.3 である[^npm-syncpack-www-npmjs-com-package-syncpack]。

| コマンド | 内容                                                      |
| -------- | --------------------------------------------------------- |
| `lint`   | 版と範囲の不一致を報告し、終了コード 0 か 1 を返す        |
| `fix`    | `lint` が報告した問題のうち自動修正できるものを書き換える |
| `update` | npm レジストリの最新版に更新する                          |
| `format` | `package.json` のフィールドの順序をそろえる               |
| `list`   | 依存を有効なものと無効なものに分けて一覧する              |
| `json`   | 依存のインスタンスごとに 1 行の JSON を出力する           |

## 不一致の検出と修正

2 つのパッケージが react、zod、typescript を違う版で持っている状態で `lint` を実行する。

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

既定の方針では、見つかった中で最も高い semver にそろえる。末尾の `DiffersToHighestOrLowestSemver` がその方針に対する違反の status code である。`fix` を実行すると矢印の向きが逆になり、各 `package.json` が書き換わる。

```text
$ syncpack fix
   2x react
      ✓ 19.1.0 ← 18.3.1 in packages/api/package.json at .dependencies
```

## Version Groups で方針を分ける

依存を Version Group に分けると、グループごとに別の方針を持たせられる。設定は `.syncpackrc.json` か `syncpack.config.ts` に書き、TypeScript の場合は `import("syncpack").RcFile` の型が使える[^syncpack-config-file]。

| 方針                    | 動作                                                |
| ----------------------- | --------------------------------------------------- |
| Highest / Lowest Semver | 見つかった中で最も高い、または低い版にそろえる      |
| Pinned                  | `pinVersion` に書いた版に固定する                   |
| Snapped To              | 指定したパッケージが持つ版に他を合わせる            |
| Same Range              | 版はそろえず、semver の範囲が重なっていれば許容する |
| Banned                  | その依存の使用を禁止する                            |
| Catalog                 | pnpm か Bun の catalog からの参照を強制する         |
| Ignored                 | 検査から除外する                                    |

出典は Version Groups の一覧である[^syncpack-version-groups]。グループは上から順に照合され、依存は最初に一致したグループだけに属する。

### Banned

HTTP クライアントを fetch へ統一するために、axios を禁止する。`label` に書いた文がそのまま出力の見出しになる。

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

`IsBanned` は自動修正の対象なので、`fix` を実行すると `axios` の行が `package.json` から削除される[^syncpack-banned-version-groups]。禁止の理由を `label` に書いておけば、CI の失敗ログがそのまま説明になる。

### Catalog

[pnpm の catalog](https://pnpm.io/catalogs) は、版を `pnpm-workspace.yaml` の 1 箇所に書き、各 `package.json` からは `catalog:` で参照する仕組みである。既存のリポジトリを catalog に移すには、`policy: "catalog"` のグループを作る。

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

`fix` を実行すると、`pnpm-workspace.yaml` に `catalog:` の節が追加されて版がそこに移り、`package.json` 側は `"react": "catalog:"` に置き換わる[^syncpack-catalog-version-groups]。

```yaml
packages:
  - packages/*
catalog:
  react: 19.1.0
  zod: ^3.25.0
```

catalog に移した後の版の更新は、`syncpack update --dependency-types pnpmCatalog` で catalog の項目だけを対象にできる[^syncpack-readme]。

## Semver Groups で範囲の書き方を決める

版そのものではなく `^` や `~` の付け方を決めるのが Semver Groups である。本番の依存は固定、devDependencies は `~`、peerDependencies は `^` のように、依存の種類ごとに範囲を指定する[^syncpack-semver-groups]。

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
