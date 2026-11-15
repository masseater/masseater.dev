# Slay the Spire 2 の Mod

Slay the Spire 2（Steam の AppID 2868840、Godot/MegaDot と C#）向けの Mod である。初代 Slay the Spire（Java・ModTheSpire・BaseMod）とは仕組みがまったく違う。

| Mod              | 内容                                                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| MapDrawUndo      | マップに描いた自分の線を Ctrl+Z（Mac は Cmd+Z も）で 1 本ずつ取り消す。消しゴムの跡も 1 本の線として取り消せる。仲間もこの Mod を入れていれば、仲間の画面からも消える          |
| PeerSelectionHud | マルチプレイで、仲間が今いる画面・カーソルを合わせているカードやレリック・マップの投票先を画面の左に出す。ゲームが同期しているデータだけを使うので、仲間が入れていなくても動く |
| MyFirstMod       | カード・レリック・パワーを足すサンプル（テンプレートのまま）                                                                                                                   |

どれもゲーム本体では確かめていない。ゲームの更新でクラスの構成が変わると、パッチは当たらなくなる。

## ビルド

ゲームとSteamがインストール済みのPCでビルドする。まず、[.NET SDK 10.0](https://dotnet.microsoft.com/download)、[MegaDot 4.5.1](https://megadot.megacrit.com/)、[Vite+](https://viteplus.dev)をインストールする。Macの場合は、`curl -fsSL https://megadot.megacrit.com/install.sh | sh` でMegaDotをインストールする。その後、Steamで[BaseLib](https://steamcommunity.com/sharedfiles/filedetails/?id=3737335127)をサブスクライブする。

`local.props.example` を `local.props` にコピーし、`GodotPath`（ゲームが既定の場所に無い場合は `Sts2Path` も）を設定する。Mac のデフォルトの場所にインストールした場合は、この手順は不要である。リポジトリのルートで `vp install` を実行し、このディレクトリで以下のコマンドを実行する。

```sh
vp run build                      # 全 Mod
vp run build mods/MapDrawUndo     # 1 つだけ
vp run publish mods/MyFirstMod    # .pck も書き出し、workshop/ にも写す
vp run new-mod NewModName         # templates/mod から mods/ と workshop/ に新しい Mod を作る
```

ゲームの「設定 → Mod Settings」に Mod が出れば配置できている。ワークショップへは Mega Crit 公式の [sts2-mod-uploader](https://github.com/megacrit/sts2-mod-uploader) で出す。`vp run publish mods/<Mod>` のあとに `./ModUploader upload -w workshop/<Mod>` を実行する。

参考になる資料は [Alchyr/ModTemplate-StS2 の Wiki](https://github.com/Alchyr/ModTemplate-StS2/wiki)、[BaseLib](https://github.com/Alchyr/BaseLib-StS2)、[Slay the Spire 2 Modding Tutorial](https://fresh-milkshake.github.io/Modding-Tutorial/)、[wiki.gg の Modding Tutorials](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Modding_Tutorials) である。ゲームのコードは、手元の `sts2.dll` を ILSpy などで読むのが確実である。
