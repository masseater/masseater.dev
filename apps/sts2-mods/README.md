# sts2-mods

**Slay the Spire 2**(Steam AppID `2868840`、Godot/MegaDot + C# 製)向けの Mod をまとめて置く場所である。
初代 Slay the Spire(Java / ModTheSpire / BaseMod、AppID 646570)とは仕組みがまったく違うので、初代向けの情報は参考にしないでください。

## Mod 一覧

| Mod                                                 | 内容                                                                                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [MapDrawUndo](mods/MapDrawUndo/README.md)           | マップに描いた自分の線を Ctrl+Z(Mac は Cmd+Z も)で 1 本ずつ取り消す。仲間の画面からも消える        |
| [PeerSelectionHud](mods/PeerSelectionHud/README.md) | マルチプレイで、仲間が今いる画面・カーソルを合わせているカード等・マップの投票先を画面左に表示する |
| [MyFirstMod](mods/MyFirstMod)                       | カード・レリック・パワーを追加するサンプル(テンプレートのまま)                                     |

## クイックスタート

ゲームと Steam が入っている PC で行う。

まず [.NET SDK 9.0 以上](https://dotnet.microsoft.com/download)、[MegaDot 4.5.1](https://megadot.megacrit.com/)、[Vite+](https://viteplus.dev) を入れる。Mac の MegaDot は `curl -fsSL https://megadot.megacrit.com/install.sh | sh` で入る。次に Steam で [BaseLib](https://steamcommunity.com/sharedfiles/filedetails/?id=3737335127) をサブスクライブする。

`local.props.example` を `local.props` にコピーし、`GodotPath`(必要なら `Sts2Path`)を書き換える。Mac で既定の場所に入れたなら、この手順は要らない。[masseater/masseater.dev](https://github.com/masseater/masseater.dev) のルートで `vp install` を実行し、以降のコマンドは `apps/sts2-mods` で実行する。

ビルドすると、Mod がゲームに配置される。

```
vp run build                       # 全 Mod (= dotnet build sts2-mods.sln)
vp run build MapDrawUndo           # 1 つだけ
vp run publish MyFirstMod          # 画像・テキストを変えたとき (.pck も書き出す)
```

ゲームを起動し、「設定 → Mod Settings」に Mod が出れば成功である。

タスクの一覧は `vp run`(選択画面が出る)か `vite.config.ts` を見てください。

## 開発のルール

警告はすべてエラーにしている。検査は `vp run dotnet` で、push の前に masseater.dev の verify が同じ検査を走らせる。

## ワークショップへの公開

Mega Crit 公式の [sts2-mod-uploader](https://github.com/megacrit/sts2-mod-uploader) を使う。

```
vp run publish MapDrawUndo
vp run stage MapDrawUndo
./ModUploader upload -w workshop/MapDrawUndo
```

## 新しい Mod を追加する

`vp run new-mod NewModName`。詳しくは [docs/new-mod.md](docs/new-mod.md)。

## 参考資料

セットアップ、カードの追加、デコンパイル、デバッグは [Alchyr/ModTemplate-StS2 Wiki](https://github.com/Alchyr/ModTemplate-StS2/wiki) に書かれている。マニフェスト、Harmony、.pck、パッケージングは [Slay the Spire 2 Modding Tutorial](https://fresh-milkshake.github.io/Modding-Tutorial/) に書かれている。[wiki.gg の Modding Tutorials](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Modding_Tutorials) にも手順がまとまっている。Mod は [BaseLib](https://github.com/Alchyr/BaseLib-StS2) を使う。公開は [megacrit/sts2-mod-uploader](https://github.com/megacrit/sts2-mod-uploader) で [Steam ワークショップ](https://steamcommunity.com/app/2868840/workshop/) に出す。

デコンパイルしたゲームのコードは [zhiyue/sts2-rl-agent の `decompiled/`](https://github.com/zhiyue/sts2-rl-agent/tree/HEAD/decompiled) にある。ただし、元にしたゲームの版は手元の版より古いことがある。手元の sts2.dll を ILSpy などで開いて見るのが確実である。
