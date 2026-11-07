# Steam ワークショップへの公開

Mega Crit 公式の [sts2-mod-uploader](https://github.com/megacrit/sts2-mod-uploader)(Steamworks を使うコマンドラインツール)でアップロードする。Steam を起動してログインした状態で行う。

## 準備(初回のみ)

まず sts2-mod-uploader を取得する。
リリースの `ModUploader-<OS>.zip` には `win-x64` / `osx-arm64` / `osx-x64` / `linux-x64` がある。ソースを clone して `dotnet publish -c Release -r <OS>` で作ってもよい。

次に `workshop/<ModName>/workshop.json` の `title`・`description`・`tags` を書く。各項目の意味は [workshop-json-reference.md](workshop-json-reference.md) にある。
`dependencies` には、依存するワークショップアイテムの ID を `[3737335127]` のように数値で書く。`["3737335127"]` と文字列にすると、アップローダが workshop config の読み込みに失敗して止まる。BaseLib は設定済みである。
`visibility` は、最初は `"private"` のままにしておく。

最後に `workshop/<ModName>/image.png` を自作のサムネイル(1MB 未満)に差し替える。

## アップロード

```
cd mods/MyFirstMod
dotnet publish                                  # 最新の json / dll / pck をゲームの mods フォルダへ
cd ../..
.\scripts\stage.ps1 -ModName MyFirstMod         # workshop/MyFirstMod/content/MyFirstMod/ にコピー
<アップローダの場所>\ModUploader.exe upload -w workshop\MyFirstMod
```

Mac / Linux では `stage.ps1` の代わりに `scripts/stage.sh MyFirstMod`、アップローダは `ModUploader`(`.exe` なし)を使う。Mac の詳細は [setup-mac.md](setup-mac.md#5-ワークショップへのアップロードmac) にある。

ワークショップには「Mod 名のフォルダごと」上げる(`content/MyFirstMod/MyFirstMod.json` など)。`stage.ps1` / `stage.sh` がその形に揃える。

初回アップロード後、ワークスペースに `mod_id.txt`(ワークショップ ID)ができる。次回以降の更新先になるので、このファイルはコミットする。

## 公開までの流れ

最初は `private` で上げる。
次に、ローカルの `<ゲーム>/mods/MyFirstMod` を一時的に退避し、Steam でサブスクライブしたものだけで動作を確かめる。
問題がなければ `workshop.json` の `visibility` を `"public"` にして上げ直す。

## 更新

`MyFirstMod.json` の `version` を上げ、`workshop.json` の `changeNote` に変更点を書いてから、上の「アップロード」と同じコマンドを実行する。

失敗したときはアップローダと同じ場所にできる `mod-uploader.log` を確認する。
