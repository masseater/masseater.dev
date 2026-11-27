# @masseater.dev/videos

masseaterの解説・紹介動画を置くRemotionのプロジェクトである。動画1本が`src/pages/<名前>/`の1フォルダで、台詞と尺を書いた`script.ts`と、カットごとの絵を書いた`video.tsx`から縦（9:16）と横（16:9）の動画を作る。部品と共通の描画は[`@masseater.dev/video-kit`](../../libs/video-kit/README.md)が持つ。

## 使い始める

```sh
docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest   # ナレーション用
node bin/videos.ts new <名前>      # script.tsとvideo.tsxの雛形
node bin/videos.ts make <名前>     # BGMと効果音の取得、ナレーション、台本の検査、確認用の静止画
vp exec remotion studio            # Studioで確かめる
node bin/videos.ts render <名前>   # out/<名前>/ にMP4
```

BGM、効果音、ナレーション、立ち絵は`public/cache/`に置き、Gitには入れない。効果音ラボは直リンクを断るので、効果音は一覧ページをChromiumで開き、ダウンロードのリンクを押して取る。Chromiumは`BROWSER_EXECUTABLE`（既定は`/opt/pw-browsers/chromium`）を使う。立ち絵は話者の公式立ち絵をキャッシュに置き、無いときはVOICEVOXの話者情報の画像を使う。

## 素材

`src/shared/config/stock.ts`に、台本の`images`に並べる素材のURLとキャッシュのパスを置く。

| 名前       | 中身                                     | 取り方                                               |
| ---------- | ---------------------------------------- | ---------------------------------------------------- |
| `IMAGES`   | いらすとやのイラストと背景、ツールのロゴ | `make`がURLから落とす。いらすとやは1本につき20点まで |
| `SHOTS`    | 紹介するツールのサイトの画面写真         | Playwrightで撮って`public/cache/shots/`に置く        |
| `ZUNDAMON` | ずんだもんの公式立ち絵（zunko.jp）       | 落として余白を切り、`public/cache/tachie/`に置く     |

`video.tsx`はページ単位の画面設計なので、px指定のTailwind、インラインstyle、ページ内の小さなコンポーネントを許している（`vite.config.ts`の`src/pages/*/video.tsx`の上書き）。
