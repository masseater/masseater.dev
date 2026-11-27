# @masseater.dev/videos

masseater の解説・紹介動画を置く Remotion のプロジェクトである。動画 1 本が `src/pages/<名前>/` の 1 フォルダで、`video.md` の台本から縦（9:16）と横（16:9）の動画を作る。見た目は [`@masseater.dev/video-kit`](../../libs/video-kit/README.md) が持つ。

## 使い始める

```sh
docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest   # ナレーション用
node bin/videos.ts new <名前>      # 台本の雛形
node bin/videos.ts make <名前>     # BGM と効果音の取得、ナレーション、台本の検査、確認用の静止画
vp exec remotion studio            # Studio で確かめる
node bin/videos.ts render <名前>   # out/<名前>/ に MP4
```

BGM、効果音、ナレーションは `public/cache/` に置き、Git には入れない。効果音ラボは直リンクを断るので、効果音は一覧ページを Chromium で開き、ダウンロードのリンクを押して取る。Chromium は `BROWSER_EXECUTABLE`（既定は `/opt/pw-browsers/chromium`）を使う。
