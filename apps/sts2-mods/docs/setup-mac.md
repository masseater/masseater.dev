# Mac でのセットアップと動作確認

Slay the Spire 2 は Mac 版があり(Apple Silicon / Intel)、Mod もそのまま動く。
公式アップローダ `sts2-mod-uploader` も macOS 向け(`osx-arm64` / `osx-x64`)にビルドされている。
共通の説明は [setup.md](setup.md) を参照し、ここでは Mac 固有の手順だけを書く。

## 1. 必要なものを入れる

| もの                     | 入れ方                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Steam + Slay the Spire 2 | https://store.steampowered.com/about/ から Mac 版 Steam を入れてログインし、ゲームをインストール                                                                                                                                                                                                                                                             |
| BaseLib                  | Steam で https://steamcommunity.com/sharedfiles/filedetails/?id=3737335127 をサブスクライブ                                                                                                                                                                                                                                                                  |
| .NET SDK 9.0 以上        | https://dotnet.microsoft.com/download/dotnet/9.0 の macOS インストーラ(Apple Silicon は Arm64、Intel は x64)。管理者パスワード無しで入れるなら `curl -fsSL https://dot.net/v1/dotnet-install.sh \| bash -s -- --channel 9.0` で `~/.dotnet` に入れ、`DOTNET_ROOT=~/.dotnet` と PATH を設定する(Homebrew の `dotnet-sdk` cask は sudo が要り、版も 10 になる) |
| MegaDot 4.5.1            | ターミナルで `curl -fsSL https://megadot.megacrit.com/install.sh \| sh`(聞かれたら両方 Enter)                                                                                                                                                                                                                                                                |

MegaDot は既定で `~/Applications/MegaDot.app` に入る。この場所ならビルド設定が自動で見つけるので `local.props` は要らない。
別の場所に入れた場合やゲームを別ライブラリに入れた場合は、`apps/sts2-mods` の `local.props` に書く(`local.props.example` 参照)。

```xml
<GodotPath>/Users/you/Applications/MegaDot.app/Contents/MacOS/Godot</GodotPath>
<Sts2Path>/Users/you/Library/Application Support/Steam/steamapps/common/Slay the Spire 2</Sts2Path>
```

## 2. パスの早見表

| 何                                   | 場所                                                                                                                   |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| ゲーム本体                           | `~/Library/Application Support/Steam/steamapps/common/Slay the Spire 2/SlayTheSpire2.app`                              |
| 参照する `sts2.dll` / `0Harmony.dll` | `SlayTheSpire2.app/Contents/Resources/data_sts2_macos_arm64/`(Intel Mac は `..._x86_64`。ビルド設定が実在する方を選ぶ) |
| ローカル Mod の置き場所              | `SlayTheSpire2.app/Contents/MacOS/mods/<ModName>/`                                                                     |
| ワークショップの Mod                 | `~/Library/Application Support/Steam/steamapps/workshop/content/2868840/<ワークショップID>/`                           |

## 3. ビルドしてゲームに入れる

```sh
cd mods/MyFirstMod
dotnet publish      # .dll / .json をコピーし、MegaDot で .pck を書き出して mods/MyFirstMod/ に置く
```

次のコマンドで `MyFirstMod.json`・`MyFirstMod.dll`・`MyFirstMod.pck` の 3 つが見えれば、配置は済んでいる。

```sh
ls ~/Library/Application\ Support/Steam/steamapps/common/Slay\ the\ Spire\ 2/SlayTheSpire2.app/Contents/MacOS/mods/MyFirstMod
```

## 4. 動作確認

Steam から Slay the Spire 2 を起動する。mods フォルダがあると Mod を使うか聞かれるので、Mod ありで起動する。
設定の Mod 一覧に `MyFirstMod` と `BaseLib` が出ていれば、読み込みは成功している。
新しくランを始め、カード報酬などに MyFirstMod のカードが出るかを確かめる。

うまくいかないときはゲームのログを見る。Godot 製ゲームの Mac のログは、通常 `~/Library/Application Support/<ゲームのデータフォルダ>/logs/godot.log` にある。
`find ~/Library/Application\ Support -iname "godot.log" 2>/dev/null` で探せる。

## 5. ワークショップへのアップロード(Mac)

[sts2-mod-uploader のリリース](https://github.com/megacrit/sts2-mod-uploader/releases)から `ModUploader-osx-arm64.zip`(Intel は `osx-x64`)を落として展開する。
リリースが無い場合は clone して `dotnet publish -c Release -r osx-arm64` でビルドする。
展開したフォルダでは、`xattr -dr com.apple.quarantine .` で Gatekeeper の隔離属性を外す。
そのうえで、Steam を起動してログインしたまま、`apps/sts2-mods` で次を実行する。

```sh
(cd mods/MyFirstMod && dotnet publish)
scripts/stage.sh MyFirstMod
<アップローダのフォルダ>/ModUploader upload -w workshop/MyFirstMod
```

Mac 版の実行ファイル名は `ModUploader`(`.exe` なし)である。以降の流れは [publishing.md](publishing.md) と同じである。

## よくあるつまずき

| 症状                                                          | 対処                                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `Slay the Spire 2 data not found at path ...`                 | ゲームが既定ライブラリ以外にある。`local.props` に `Sts2Path` を書く                     |
| `Godot path must be set up before publishing`                 | MegaDot が `~/Applications/MegaDot.app` に無い。`local.props` に `GodotPath` を書く      |
| MegaDot や ModUploader が「開発元を確認できない」で起動しない | `xattr -dr com.apple.quarantine <アプリまたはフォルダ>`                                  |
| `dotnet` が見つからない                                       | ターミナルを開き直す。それでもだめなら `/usr/local/share/dotnet/dotnet` を PATH に入れる |
