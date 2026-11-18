---
title: "syncpack: モノレポ内のpackage.jsonファイル間で依存関係のバージョンを統一する"
description: "syncpackのリントと修正を適用し、依存関係を禁止してVersion Groupを用いてpnpmカタログへ自動的に移行し、Semver Groupで範囲を指定した結果。"
tags: ["syncpack", "pnpm", "monorepo"]
published: true
---

モノレポでは、`packages/web` が react 19.1.0 なのに `packages/api` が react 18.3.1 といった不一致は、誰にも気づかれない傾向にある。[syncpack](https://syncpack.dev/) は、ワークスペース内のすべての `package.json` を読み込み、同一依存関係のバージョンが一致しない箇所を報告して修正する CLI だ[^syncpack-readme]。npm パッケージとして、optionalDependencies を通じて各 OS 用のネイティブバイナリが同梱されており、現在のバージョンは 15.3.3[^npm-syncpack-www-npmjs-com-package-syncpack] である。

| コマンド | 機能                                                           |
| -------- | -------------------------------------------------------------- |
| `lint`   | バージョンや範囲の不一致を報告し、終了コード 0 または 1 を返す |
| `fix`    | `lint` で報告された、自動的に修正可能な問題を書き直す          |
| `update` | npmレジストリの最新バージョンの更新                            |
| `format` | `package.json` のフィールドの順序を揃える                      |
| `list`   | 依存関係を、有効なものと無効なものに分けて列挙している         |
| `json`   | 依存関係の各インスタンスに対して1行のJSONを出力する            |

## 不一致の検出と修正

2つのパッケージ（zodとtypescript）が異なるバージョンでReactを実行している状態で`lint`を実行する。

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

デフォルトのポリシーは、見つかった中で最も高いsemverに合わせることである。末尾の `DiffersToHighestOrLowestSemver` は、そのポリシー違反を示すステータスコードである。`fix` を実行すると、矢印の向きが反転し、各 `package.json` が書き換えられる。

```text
$ syncpack fix
   2x react
      ✓ 19.1.0 ← 18.3.1 in packages/api/package.json at .dependencies
```

## バージョングループによるポリシーの分割

依存関係をバージョングループに分割すると、各グループに独自のポリシーを設定できる。設定は `.syncpackrc.json` または `syncpack.config.ts` に記述し、TypeScript では `import("syncpack").RcFile`[^syncpack-config-file] という型を利用できる。

| ポリシー           | 挙動                                                                         |
| ------------------ | ---------------------------------------------------------------------------- |
| 最高 / 最低 Semver | 見つかった最高または最低のバージョンに合わせる                               |
| 固定済み           | `pinVersion` で記述されたバージョンにピン留めされる                          |
| Snapped To         | 他のものを指定したパッケージのバージョンに合わせる                           |
| 同一範囲           | バージョンの整合性は保たれず、セマンティック範囲が重複する場合は許容される。 |
| 禁止               | その依存関係の使用を禁止する                                                 |
| カタログ           | pnpmまたはBunカタログの参照を強制する                                        |
| 無視された         | チェック対象から除外する                                                     |

ソースは Version Group[^syncpack-version-groups] の一覧である。グループは上から下へと対応付けられ、依存関係は最初にマッチしたグループにのみ属する。

### Banned

fetch で HTTP クライアントを統一するため、axios を禁止する。`label` に書かれた文がそのまま出力の見出しになる。

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

`IsBanned` は自動修正の対象なので、`fix` を実行すると `package.json` から `axios` の行が削除される[^syncpack-banned-version-groups]。`label` に禁止理由を記述すれば、CI の失敗ログで自然と説明される。

### Catalog

[pnpm カタログ](https://pnpm.io/catalogs) は、バージョンを `pnpm-workspace.yaml` という一箇所に記述し、各 `package.json` が `catalog:` で参照する仕組みだ。既存のリポジトリをカタログに移動するには、`policy: "catalog"` のグループを作成する。

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

`fix` を実行すると、`pnpm-workspace.yaml` に `catalog:` セクションが追加され、バージョンがそこに移動し、`package.json` の `"react": "catalog:"` に置き換えられる。[^syncpack-catalog-version-groups]

```yaml
packages:
  - packages/*
catalog:
  react: 19.1.0
  zod: ^3.25.0
```

カタログに移動した後、`syncpack update --dependency-types pnpmCatalog`[^syncpack-readme] を指定することで、カタログエントリのみを対象にバージョン更新を行うことができる。

## Semver Groupで範囲を記述する方法を決める

Semver Groupsは、バージョンそのものではなく、`^`や`~`の付け方を決定する。本番環境の依存関係には pinned、devDependencies には `~`、peerDependencies には `^` というように、依存関係の種類ごとに範囲を指定する。

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
