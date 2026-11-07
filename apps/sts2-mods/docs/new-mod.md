# 新しい Mod を追加する

```
vp run new-mod NewModName
```

これで次のものができる。

- `mods/NewModName/`: csproj、マニフェスト、`NewModNameCode/MainFile.cs`、.pck 書き出し用の `project.godot` と `export_presets.cfg`。`MainFile.cs` は Harmony のパッチを全部当てるだけの入口である
- `workshop/NewModName/`: アップローダ用ワークスペース(`workshop.json` の `title` と `description`、`image.png` は書き換える)
- `sts2-mods.sln` への登録

Mod 名は英字で始まる英数字だけ(スペースとアンダースコアは不可)。

## 作ったあとに決めること

| やりたいこと                                   | すること                                                                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 画像やローカライズを入れる                     | `mods/NewModName/NewModName/` を作って入れ、`NewModName.json` の `has_pck` を `true` にする。`vp run publish NewModName` で .pck も出る     |
| ゲームの private メンバーを使う                | csproj に `<Publicize>true</Publicize>`。`nameof` と直接アクセスで書けるようになる([development.md](development.md#harmony-パッチの書き方)) |
| 仲間とプレイ内容が変わる Mod                   | `NewModName.json` の `affects_gameplay` を `true` にする                                                                                    |
| ゲームの型を新しく使う                         | `build/Sts2Stubs/` にも同じシグネチャで足す(CI の型チェック用)                                                                              |
| スタブで型チェックできないほどゲームの型を使う | csproj に `<SupportsSts2Stubs>false</SupportsSts2Stubs>`(CI では整形だけになる)                                                             |

共通で使いたいコードは `shared/` に置くと全 Mod にソースとして取り込まれます(名前空間 `Sts2Mods.Common`)。
取り込みたくない Mod は csproj に `<UseSharedCode>false</UseSharedCode>`。

## カードやレリックを足すコンテンツ Mod

`mods/MyFirstMod` がテンプレート(Alchyr.Sts2.Templates の Content テンプレート)そのままのサンプルである。
`Cards/`・`Relics/`・`Powers/` の基底クラスと、`MyFirstMod/localization/eng/*.json` の書き方を参考にしてください。
