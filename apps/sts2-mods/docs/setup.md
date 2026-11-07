# 開発環境のセットアップ

ビルドにはゲーム本体の `sts2.dll` と `0Harmony.dll` が必要なので、Slay the Spire 2 がインストールされた PC で作業する。

## 仕組み

Mod は C#(`net9.0`)で書き、ゲームの `sts2.dll` を参照してビルドする。既存処理の変更は Harmony のパッチで行う。
画像・テキスト・シーンは Godot の `.pck` にまとめる。書き出しには MegaDot 4.5.1(Mega Crit 版 Godot)を使う。これより新しい Godot で作った `.pck` はゲームが読み込まない。
1 つの Mod は、`<Id>.json`(マニフェスト)、`<Id>.dll`、`<Id>.pck` の最大 3 ファイルからなる。
コンテンツは、共通ライブラリ BaseLib(ワークショップ ID `3737335127`)の `CustomCardModel` などを継承して作る。

## 必要なもの

| もの                 | 入手先                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------- |
| .NET SDK 9.0 以上    | https://dotnet.microsoft.com/download                                                       |
| MegaDot 4.5.1 (mono) | https://megadot.megacrit.com/(代わりに同じバージョンの Godot .NET でも可)                   |
| BaseLib              | Steam で https://steamcommunity.com/sharedfiles/filedetails/?id=3737335127 をサブスクライブ |
| IDE                  | Rider 推奨。Visual Studio や VS Code + C# Dev Kit でも可                                    |

## パスの設定

`apps/sts2-mods` で `local.props.example` を `local.props` にコピーして編集する。`local.props` はコミットされない。
`GodotPath` には MegaDot の実行ファイルを、引用符を付けずに書く。
`Sts2Path` は、ゲームが `C:/Program Files (x86)/Steam/steamapps/common/Slay the Spire 2` 以外にある場合だけ書く。

ゲームの場所は Windows ではレジストリから自動検出も試みる(`build/Sts2PathDiscovery.props`)。Mac の手順は [setup-mac.md](setup-mac.md) にまとめている。

## ビルドと確認

```
cd mods/MyFirstMod
dotnet build     # .dll と .json を <ゲーム>/mods/MyFirstMod/ にコピー
dotnet publish   # 上記に加えて MegaDot で .pck を書き出す
```

C# だけを変えたときは `build` で足りる。画像・テキスト・シーンを変えたら、必ず `publish` する。
Rider では、ビルドはハンマーアイコン、publish はプロジェクトを右クリック →「Publish」→「Local folder」で行う。
ゲームを起動し「設定 → Mod Settings」に出れば読み込まれている。

ローカルの Mod は `<ゲームのインストール先>/mods/` に置く。Mac では `SlayTheSpire2.app/Contents/MacOS/mods/` である。
ワークショップから入れた Mod は `Steam/steamapps/workshop/content/2868840/<ワークショップID>/` に入る。

## よくあるエラー

| エラー                                                                                                             | 対処                                                                            |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `The SDK 'Godot.NET.Sdk/4.5.1' specified could not be found`                                                       | `dotnet nuget add source https://api.nuget.org/v3/index.json`                   |
| `Slay the Spire 2 data not found at path ...`                                                                      | `local.props` の `Sts2Path` を設定                                              |
| `Godot path must be set up before publishing`                                                                      | `local.props` の `GodotPath` を確認                                             |
| `MonoMod.Core.Interop...Value does not fall within the expected range` / `Undefined resource string ID:0x80070057` | csproj の `<Publicize>` を `true` にするか、`Krafs.Publicizer` パッケージを外す |
| publish だけ失敗する                                                                                               | `GodotPublish` の実行時に `DOTNET_ROOT` を dotnet のある場所に設定              |

## 次に読むもの

Alchyr のテンプレートの wiki には、[Modding Basics](https://github.com/Alchyr/ModTemplate-StS2/wiki/Modding-Basics)、[Testing and Debugging](https://github.com/Alchyr/ModTemplate-StS2/wiki/Testing-and-Debugging)、[Adding Cards](https://github.com/Alchyr/ModTemplate-StS2/wiki/Adding-Cards) がある。
本体の実装を読むのが一番の近道で、その手順は [Decompiling](https://github.com/Alchyr/ModTemplate-StS2/wiki/Decompiling) と [Extracting Assets and Text](https://github.com/Alchyr/ModTemplate-StS2/wiki/Extracting-Assets-and-Text) にある。
