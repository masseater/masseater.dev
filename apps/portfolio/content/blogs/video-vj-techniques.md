---
title: "動画・VJ でよく使われる表現の手法集"
description: "グリッチ、カメラワーク、編集、合成、アニメの撮影処理、VJ の操作、ライブの特殊効果、ゲームや広告の定番まで、動画と VJ でよく使われる表現を 20 の分類に集め、実例へのリンクを付けた一覧。"
tags: ["表現技法", "VJ", "映像"]
published: true
---

動画と VJ でよく使われる手法を、名前の定まっていない定番表現も含めて 20 の分類に集めた。実例のリンクは Wikipedia の項目か、その表現で知られる作品を指し、項目の無いものは解説記事やツールのマニュアルを指す。

## グリッチと質感

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| データモッシュ | 圧縮のキーフレームを抜き、前の絵が次の動きで崩れていくようにする | [Welcome to Heartbreak の MV](https://en.wikipedia.org/wiki/Welcome_to_Heartbreak) |
| グリッチ | データの破損やデコードの誤りをわざと見せる | [グリッチアート](https://en.wikipedia.org/wiki/Glitch_art) |
| ピクセルソート | 画素を明るさ順などで並べ替え、流れる帯にする | [ASDFPixelSort](https://github.com/kimasendorf/ASDFPixelSort) |
| RGB ずらし | 色の版をずらして、にじみやぶれを出す | [色収差](https://en.wikipedia.org/wiki/Chromatic_aberration)を模したもの |
| 圧縮ノイズの強調 | JPEG のブロックノイズを拡大して見せる | [Thomas Ruff の jpegs](https://en.wikipedia.org/wiki/Thomas_Ruff)、[圧縮アーティファクト](https://en.wikipedia.org/wiki/Compression_artifact) |
| モザイク・低解像度化 | 画素を粗くして、伏せ字や 8bit 風に見せる | [Pixelization](https://en.wikipedia.org/wiki/Pixelization) |
| VHS・CRT 風 | 走査線、トラッキングノイズ、色のにじみで古いビデオにする | [ヴェイパーウェイヴ](https://en.wikipedia.org/wiki/Vaporwave)、[アナログホラー](https://en.wikipedia.org/wiki/Analog_horror) |
| フィルムグレイン・傷 | 粒子や傷、ゴミを重ねてフィルムの質感にする | [Film grain](https://en.wikipedia.org/wiki/Film_grain) |
| ライトリーク・フィルムバーン | 光漏れや焼けを重ね、場面の切れ目を温かく見せる | [Light leak](https://en.wikipedia.org/wiki/Light_leak) |
| ディザ | 少ない色の点の並びで階調を出す | [Dither](https://en.wikipedia.org/wiki/Dither) |
| ASCII 化 | 映像を文字の濃淡で描き直す | [ASCII アート](https://en.wikipedia.org/wiki/ASCII_art) |
| ハーフトーン | 網点で印刷物のように見せる | [Halftone](https://en.wikipedia.org/wiki/Halftone)、[スパイダーバース](https://en.wikipedia.org/wiki/Spider-Man:_Into_the_Spider-Verse) |
| ポスタリゼーション | 階調を数段に落として版画のように見せる | [Posterization](https://en.wikipedia.org/wiki/Posterization) |
| ソラリゼーション | 明暗の一部だけを反転させ、縁が光る絵にする | [Solarization](https://en.wikipedia.org/wiki/Solarization_(photography)) |
| ネガ反転 | 色と明暗を反転させ、一瞬の衝撃に使う | [Negative](https://en.wikipedia.org/wiki/Negative_(photography)) |
| デュオトーン | 2 色だけで塗り直す | [Duotone](https://en.wikipedia.org/wiki/Duotone) |
| 偽色・サーモ風 | 明るさや熱を別の色の並びに置き換える | [False color](https://en.wikipedia.org/wiki/False_color)、[Thermography](https://en.wikipedia.org/wiki/Thermography) |
| 赤外線・ナイトビジョン | 赤外の写り方や暗視の緑一色で異質な空気を出す | [Infrared photography](https://en.wikipedia.org/wiki/Infrared_photography)、[Night vision](https://en.wikipedia.org/wiki/Night_vision) |
| ローリングシャッター | 速い動きや振動で絵がぐにゃりと傾き、揺れる | [Rolling shutter](https://en.wikipedia.org/wiki/Rolling_shutter) |
| エッジ抽出・線画化 | 輪郭だけを取り出して光る線にする | [Edge detection](https://en.wikipedia.org/wiki/Edge_detection) |
| レンズフレア | 光源から伸びる光の筋や輪を足す | [Lens flare](https://en.wikipedia.org/wiki/Lens_flare)、多用で知られる [J. J. Abrams](https://en.wikipedia.org/wiki/J._J._Abrams) |
| ブルーム・グロー | 明るい部分をにじませて発光させる | [Bloom](https://en.wikipedia.org/wiki/Bloom_(shader_effect)) |
| ボケ | 背景の光を丸くぼかす | [Bokeh](https://en.wikipedia.org/wiki/Bokeh) |
| モーションブラー・残像 | 動きの軌跡を尾のように残す | [Motion blur](https://en.wikipedia.org/wiki/Motion_blur) |

## 時間とカメラ

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| スリットスキャン | 行ごとに違う時刻を写し、時間を空間に引き伸ばす | [2001年宇宙の旅のスターゲート](https://en.wikipedia.org/wiki/Slit-scan_photography) |
| バレットタイム | 時間を止めたままカメラだけが回り込む | [マトリックス](https://en.wikipedia.org/wiki/Bullet_time) |
| タイムラプス | 間隔をあけて撮って早回しにする | [Time-lapse](https://en.wikipedia.org/wiki/Time-lapse_photography) |
| ハイパーラプス | 移動しながら撮るタイムラプス | [Hyperlapse](https://en.wikipedia.org/wiki/Hyperlapse) |
| 昼から夜への合成 | 同じ画角の一日を縦や斜めの帯でつなぐ | [Stephen Wilkes の Day to Night](https://en.wikipedia.org/wiki/Stephen_Wilkes) |
| ハイスピード撮影 | 数百から数千コマで撮り、一瞬を長く引き伸ばす | [High-speed camera](https://en.wikipedia.org/wiki/High-speed_camera)、[The Slow Mo Guys](https://en.wikipedia.org/wiki/The_Slow_Mo_Guys) |
| フレーム補間スロー | 間のコマを計算で作り、普通に撮った素材を滑らかなスローにする | [Motion interpolation](https://en.wikipedia.org/wiki/Motion_interpolation)、[Twixtor](https://www.macworld.com/article/165639/twixtor.html) |
| スピードランプ | 一つのカットの中で速度を速めたり緩めたりする | [Speed ramping](https://en.wikipedia.org/wiki/Speed_ramping)、[300](https://en.wikipedia.org/wiki/300_(film)) |
| 逆再生 | 撮った動きを後ろから流す | [Reverse motion](https://en.wikipedia.org/wiki/Reverse_motion) |
| 逆再生リップシンク | 歌を逆から口で合わせて撮り、逆再生すると周りだけが巻き戻る | [Coldplay の The Scientist](https://en.wikipedia.org/wiki/The_Scientist_(song))、[Strawberry Fields Forever](https://en.wikipedia.org/wiki/Strawberry_Fields_Forever) |
| 倍速リップシンク | 速めた曲で口を合わせて高速度で撮り、スローなのに口が合うようにする | [PremiumBeat の解説](https://www.premiumbeat.com/blog/4-iconic-music-video-effects/) |
| フリーズフレーム | 一つのコマで止めて印象づける | [Freeze frame](https://en.wikipedia.org/wiki/Freeze_frame_shot) |
| ストロボ | 明滅で動きを細切れにし、ビートを強く見せる | [Strobe light](https://en.wikipedia.org/wiki/Strobe_light) |
| ワゴンホイール効果 | 回る物がコマの間隔とずれて、止まったり逆に回ったりして見える | [Wagon-wheel effect](https://en.wikipedia.org/wiki/Wagon-wheel_effect) |
| ドリーズーム | 寄りながらズームを引き、背景だけが伸び縮みする | [Dolly zoom](https://en.wikipedia.org/wiki/Dolly_zoom)、[めまい](https://en.wikipedia.org/wiki/Vertigo_(film)) |
| ティルトシフト | ピントの帯を細くして街をミニチュアに見せる | [Tilt-shift](https://en.wikipedia.org/wiki/Tilt%E2%80%93shift_photography) |
| ラックフォーカス | ピントを手前から奥へ移して視線を導く | [Focus pulling](https://en.wikipedia.org/wiki/Focus_pulling) |
| スプリットディオプター | 手前と奥の両方に同時にピントを合わせる | [Split diopter](https://en.wikipedia.org/wiki/Split_diopter) |
| レンズウォッキング | レンズを外して手で傾け、光漏れとピントのずれを出す | [Freelensing](https://en.wikipedia.org/wiki/Freelensing) |
| 魚眼レンズ | 大きくゆがめた近距離の画で迫力を出す | [Fisheye lens](https://en.wikipedia.org/wiki/Fisheye_lens)、[Hype Williams の MV](https://en.wikipedia.org/wiki/Hype_Williams) |
| ダッチアングル | 画面を傾けて不安や緊張を出す | [Dutch angle](https://en.wikipedia.org/wiki/Dutch_angle) |
| 真上からの俯瞰 | 真上から群舞を撮って万華鏡のような模様にする | [Busby Berkeley](https://en.wikipedia.org/wiki/Busby_Berkeley) |
| 一人称視点 | 登場人物の目線だけで撮る | [Point-of-view shot](https://en.wikipedia.org/wiki/Point-of-view_shot)、[Smack My Bitch Up](https://en.wikipedia.org/wiki/Smack_My_Bitch_Up)、[Hardcore Henry](https://en.wikipedia.org/wiki/Hardcore_Henry) |
| ホイップパン | カメラを素早く振って流れた絵で場面をつなぐ | [Whip pan](https://en.wikipedia.org/wiki/Whip_pan) |
| クラッシュズーム | 一気に寄って驚きや笑いを強める | [Crash zoom](https://en.wikipedia.org/wiki/Crash_zoom) |
| スノリカム | 体にカメラを固定し、人は止まって背景が揺れる | [SnorriCam](https://en.wikipedia.org/wiki/SnorriCam) |
| 手持ちの揺れ・カメラシェイク | 揺れで臨場感や衝撃を足す | [Shaky camera](https://en.wikipedia.org/wiki/Shaky_camera) |
| 長回し・ワンカット風 | 切らずに（切れ目を隠して）一続きで見せる | [Long take](https://en.wikipedia.org/wiki/Long_take)、[1917](https://en.wikipedia.org/wiki/1917_(2019_film))、[ロープ](https://en.wikipedia.org/wiki/Rope_(film)) |
| FPV ドローンの一筆書き | 小型ドローンで建物の中を縫うように飛ぶ | [FPV](https://en.wikipedia.org/wiki/First-person_view_(radio_control)) |
| 無限ズーム | 宇宙から細胞まで、寄り続けてスケールを渡る | [Powers of Ten](https://en.wikipedia.org/wiki/Powers_of_Ten_(film)) |
| ライトペインティング・長時間露光 | 動く光の軌跡を線として残す | [Light painting](https://en.wikipedia.org/wiki/Light_painting) |
| シネマグラフ | 写真の一部だけが動き続けるループ | [Cinemagraph](https://en.wikipedia.org/wiki/Cinemagraph) |
| 分身・クローン合成 | 同じ人を何度も撮って重ね、画面を分身で埋める | [Kylie Minogue の Come Into My World](https://en.wikipedia.org/wiki/Come_Into_My_World) |
| 回転セット | 部屋ごと回して、壁や天井を歩くように見せる | [Royal Wedding の天井を踊る場面](https://en.wikipedia.org/wiki/Royal_Wedding) |
| ファウンドフッテージ・監視カメラ風 | 素人の記録映像や防犯カメラの映像に見せる | [Found footage](https://en.wikipedia.org/wiki/Found_footage_(film_technique)) |
| 画面比率の変化 | 話の途中で画面の縦横比を広げたり狭めたりする | [Mommy](https://en.wikipedia.org/wiki/Mommy_(2014_film)) |
| トラッキングショット | 台車やレールで被写体と一緒に移動しながら撮る | [Tracking shot](https://en.wikipedia.org/wiki/Tracking_shot) |
| クレーンショット | 高く上がりながら場面の全景へ引いていく | [Crane shot](https://en.wikipedia.org/wiki/Crane_shot) |
| ステディカム | 滑るように歩いて人物の後を追う | [Steadicam](https://en.wikipedia.org/wiki/Steadicam) |
| 空撮 | 上空から街や地形を見下ろす | [Aerial photography](https://en.wikipedia.org/wiki/Aerial_photography) |
| 水中撮影 | 水の中から揺れる光と人を撮る | [Underwater photography](https://en.wikipedia.org/wiki/Underwater_photography) |
| あおり | 下から見上げて大きく強く見せる | [Worm's-eye view](https://en.wikipedia.org/wiki/Worm%27s-eye_view) |
| 超クローズアップ | 目や唇だけで画面を埋める | [Extreme close-up](https://en.wikipedia.org/wiki/Extreme_close-up) |
| 状況説明ショット | 場面の頭に建物や街の全景を見せて場所を伝える | [Establishing shot](https://en.wikipedia.org/wiki/Establishing_shot) |
| フリッカー映画 | 黒と白のコマだけを速く交互に映し、残像で色や模様を見せる | [Tony Conrad](https://en.wikipedia.org/wiki/Tony_Conrad)、[Structural film](https://en.wikipedia.org/wiki/Structural_film)、[Flicker](https://en.wikipedia.org/wiki/Flicker_(screen)) |

## 編集とトランジション

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| マッチカット | 形や動きの似たカットでつなぎ、時間や場所を飛ばす | [Match cut](https://en.wikipedia.org/wiki/Match_cut)、[2001年宇宙の旅の骨](https://en.wikipedia.org/wiki/2001:_A_Space_Odyssey) |
| 動きでつなぐ | 投げる、振り向くなどの動きの途中で次のカットへ移る | [Cutting on action](https://en.wikipedia.org/wiki/Cutting_on_action) |
| ジャンプカット | 同じ画角のまま時間を飛ばしてつなぐ | [Jump cut](https://en.wikipedia.org/wiki/Jump_cut)、[勝手にしやがれ](https://en.wikipedia.org/wiki/Breathless_(1960_film)) |
| スマッシュカット | 静から動など、落差の大きい場面へ急に切る | [Smash cut](https://en.wikipedia.org/wiki/Smash_cut) |
| 白フラッシュ・フラッシュカット | 白いコマやごく短いカットを一瞬挟み、衝撃や記憶のよみがえりを示す | [Flash cut](https://en.wikipedia.org/wiki/Flash_cut) |
| 音ハメ | カットや動きを曲の拍や音に合わせる | [ベイビー・ドライバー](https://en.wikipedia.org/wiki/Baby_Driver) |
| スタッター | 同じ瞬間を細かく繰り返して音と一緒に刻む | [Stutter edit](https://en.wikipedia.org/wiki/Stutter_edit) |
| スクラッチ・ビデオ | 映像を DJ のように切り貼りして繰り返す | [Scratch video](https://en.wikipedia.org/wiki/Scratch_video)、[Coldcut](https://en.wikipedia.org/wiki/Coldcut) |
| モンタージュ | 短いカットの連続で、時間の経過や意味を圧縮する | [Montage](https://en.wikipedia.org/wiki/Montage_(filmmaking)) |
| クロスカッティング | 同じ時に起きている別の場面を交互に見せる | [Cross-cutting](https://en.wikipedia.org/wiki/Cross-cutting) |
| J カット・L カット | 音だけを映像より先に（または後まで）切り替えて場面をつなぐ | [Split edit](https://en.wikipedia.org/wiki/Split_edit) |
| ワイプ | 線や形が画面を横切って次の場面に入れ替える | [Wipe](https://en.wikipedia.org/wiki/Wipe_(transition)) |
| アイリス | 丸く絞って閉じる、または開く | [Iris shot](https://en.wikipedia.org/wiki/Iris_shot) |
| ディゾルブ | 前後のカットを重ねながら入れ替える | [Dissolve](https://en.wikipedia.org/wiki/Dissolve_(filmmaking)) |
| 二重露光 | 人物のシルエットの中に風景を入れるなど、2 枚を重ねる | [Multiple exposure](https://en.wikipedia.org/wiki/Multiple_exposure) |
| 隠しカット | 物や背中が画面を横切る瞬間でつなぎ、切れ目を消す | [ロープ](https://en.wikipedia.org/wiki/Rope_(film)) |
| モーフィング | 形や顔を別のものへ滑らかに変える | [Black or White](https://en.wikipedia.org/wiki/Black_or_White) |
| ケン・バーンズ | 静止画をゆっくり寄ったり流したりして動かす | [Ken Burns effect](https://en.wikipedia.org/wiki/Ken_Burns_effect) |
| 切り返し | 話す二人を交互に切り替える | [Shot reverse shot](https://en.wikipedia.org/wiki/Shot_reverse_shot) |
| クレショフ効果 | 同じ顔でも前後に繫ぐ画によって違う感情に見える | [Kuleshov effect](https://en.wikipedia.org/wiki/Kuleshov_effect) |
| フェードイン・フェードアウト | 黒や白から現れ、黒や白に消える | [Fade](https://en.wikipedia.org/wiki/Fade_(filmmaking)) |
| モーフカット | インタビューの言い淀みを切った跳びを、顔を変形させて目立たなくする | [Morph cut](https://en.wikipedia.org/wiki/Morph_cut) |
| インサート | 手元や物の寄りを差し込んで情報を足す | [Insert](https://en.wikipedia.org/wiki/Insert_(filmmaking)) |
| カットアウェイ | 本筋から一瞬だけ別の画に離れて戻る | [Cutaway](https://en.wikipedia.org/wiki/Cutaway_(filmmaking)) |
| スーパーカット | 同じ台詞や仕草を多くの作品から集めて畳みかける | [Supercut](https://en.wikipedia.org/wiki/Supercut) |
| マッシュアップ動画 | 別々の映像と音を組み合わせて新しい作品にする | [Mashup](https://en.wikipedia.org/wiki/Mashup_(video)) |
| ファンの編集動画 | 好きな作品の場面を曲に合わせて編み直す | [Vidding](https://en.wikipedia.org/wiki/Vidding)、[Fan video](https://en.wikipedia.org/wiki/Fan_video) |
| イマジナリーライン | 向かい合う二人の位置関係を保つため、カメラを越えさせない線 | [180-degree rule](https://en.wikipedia.org/wiki/180-degree_rule) |
| 第四の壁を破る | 登場人物がカメラに向かって観客に話しかける | [Breaking the fourth wall](https://en.wikipedia.org/wiki/Breaking_the_fourth_wall) |

## 合成と画面構成

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| クロマキー | 単色の背景を抜いて別の映像と重ねる | [Chroma key](https://en.wikipedia.org/wiki/Chroma_key) |
| シュフタン・プロセス | 鏡を斜めに置いて、ミニチュアと役者を一つの画に収める | [Schüfftan process](https://en.wikipedia.org/wiki/Sch%C3%BCfftan_process) |
| ミニチュア | 縮小模型を実物大に見せる | [Miniature effect](https://en.wikipedia.org/wiki/Miniature_effect) |
| マッチムーブ | 実写のカメラの動きを解析して CG を貼り付ける | [Match moving](https://en.wikipedia.org/wiki/Match_moving) |
| 分割画面 | 一つの画面に複数の映像を並べる | [Split screen](https://en.wikipedia.org/wiki/Split_screen_(video_production)) |
| タイル状の顔並べ | 格子に人を並べ、視線や動きをマスをまたいでやり取りさせる | [ゆかいなブラッディー家のオープニング](https://en.wikipedia.org/wiki/The_Brady_Bunch) |
| ピクチャーインピクチャー | 小窓で別の映像を同時に見せる | [Picture-in-picture](https://en.wikipedia.org/wiki/Picture-in-picture) |
| リアクション動画 | 元の動画と、それを見る人の顔を並べる | [Reaction video](https://en.wikipedia.org/wiki/Reaction_video) |
| 万華鏡・ミラー | 映像を折り返して対称の模様にする | [Kaleidoscope](https://en.wikipedia.org/wiki/Kaleidoscope) |
| ドロステ | 画の中に同じ画を入れ、どこまでも入れ子にする | [Droste effect](https://en.wikipedia.org/wiki/Droste_effect) |
| マットペインティング | 描いた背景と実写を合わせて存在しない景色を作る | [Matte painting](https://en.wikipedia.org/wiki/Matte_painting) |
| ホリゾント | 継ぎ目の無い白や単色の背景で、空間を消す | [Cyclorama](https://en.wikipedia.org/wiki/Cyclorama) |
| 2.5D パララックス | 写真を奥行きごとに切り分け、層をずらして立体に見せる | [The Kid Stays in the Picture](https://en.wikipedia.org/wiki/The_Kid_Stays_in_the_Picture)、[Parallax scrolling](https://en.wikipedia.org/wiki/Parallax_scrolling) |
| コラージュ・フォトモンタージュ | 切り抜いた写真を貼り合わせて動かす | [Photomontage](https://en.wikipedia.org/wiki/Photomontage)、[Terry Gilliam](https://en.wikipedia.org/wiki/Terry_Gilliam) |
| 実写とアニメの同居 | 実写の世界に描いたキャラや落書きを乗せる | [ロジャー・ラビット](https://en.wikipedia.org/wiki/Who_Framed_Roger_Rabbit) |
| スクリーンライフ | PC やスマホの画面だけで話を進める | [Screenlife](https://en.wikipedia.org/wiki/Screenlife)、[Unfriended](https://en.wikipedia.org/wiki/Unfriended) |
| 空中に浮かぶ UI | 半透明の画面や数値を空間に重ね、未来の道具に見せる | [マイノリティ・リポート](https://en.wikipedia.org/wiki/Minority_Report_(film)) |
| シルエット | 人を黒一色に抜き、鮮やかな単色の背景で踊らせる | [iPod の広告](https://en.wikipedia.org/wiki/IPod_advertising) |
| 強制遠近法 | 距離の違う物を重ね、大きさを錯覚させる | [Forced perspective](https://en.wikipedia.org/wiki/Forced_perspective) |
| 一発撮りの仕掛け | 振り付けや装置を一続きで撮りきる | [OK Go の Here It Goes Again](https://en.wikipedia.org/wiki/Here_It_Goes_Again)、[Der Lauf der Dinge](https://en.wikipedia.org/wiki/Der_Lauf_der_Dinge) |
| エイムズの部屋 | 歪んだ部屋で人が巨人にも小人にも見える | [Ames room](https://en.wikipedia.org/wiki/Ames_room) |
| 不可能図形 | ペンローズの階段のような、ありえない立体を動かす | [Impossible object](https://en.wikipedia.org/wiki/Impossible_object)、[Penrose stairs](https://en.wikipedia.org/wiki/Penrose_stairs) |
| 既存映像の流用 | 古いニュースや記録映像を素材に別の意味を組み立てる | [Found footage](https://en.wikipedia.org/wiki/Found_footage_(appropriation)) |

## 実写の特殊効果と色

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| 弾着 | 服の下の小さな火薬と血糊で撃たれた瞬間を作る | [Bullet hit squib](https://en.wikipedia.org/wiki/Bullet_hit_squib) |
| 爆破・火薬 | 本物の炎と爆発を撮る | [Pyrotechnics](https://en.wikipedia.org/wiki/Pyrotechnics)、[Practical effect](https://en.wikipedia.org/wiki/Practical_effect) |
| 雨・霧・風の装置 | 天候を機械で作って場面に降らせる | [Practical effect](https://en.wikipedia.org/wiki/Practical_effect) |
| ワイヤーアクション | 人をワイヤーで吊って飛んだり壁を走ったりさせる | [Wire fu](https://en.wikipedia.org/wiki/Wire_fu) |
| アニマトロニクス | 機械仕掛けの人形で生き物を動かす | [Animatronics](https://en.wikipedia.org/wiki/Animatronics) |
| 特殊メイク | 作り物の皮膚や傷で顔や体を変える | [Prosthetic makeup](https://en.wikipedia.org/wiki/Prosthetic_makeup) |
| 着ぐるみ特撮 | 人が着ぐるみに入り、ミニチュアの街で暴れる | [Suitmation](https://en.wikipedia.org/wiki/Suitmation) |
| リアプロジェクション | 役者の後ろのスクリーンに風景を映して一緒に撮る（車の中の場面など） | [Rear projection](https://en.wikipedia.org/wiki/Rear_projection) |
| フロントプロジェクション | カメラ側から再帰反射の幕に背景を映して合成する | [Front projection effect](https://en.wikipedia.org/wiki/Front_projection_effect) |
| ストップトリック | カメラを止めて物を入れ替え、突然消えたり現れたりさせる | [Substitution splice](https://en.wikipedia.org/wiki/Substitution_splice) |
| モーションコントロール | ロボットのカメラで同じ動きを何度も繰り返し、合成や高速の商品撮影に使う | [Motion control photography](https://en.wikipedia.org/wiki/Motion_control_photography) |
| 群衆シミュレーション | 何万人もの群衆を CG でそれぞれ動かす | [Crowd simulation](https://en.wikipedia.org/wiki/Crowd_simulation) |
| デジタル若返り | 役者の顔を CG で若い頃に戻す | [De-aging in film](https://en.wikipedia.org/wiki/De-aging_in_film) |
| 本物の無重力 | 放物線飛行の飛行機内で無重力の数十秒を撮る | [OK Go の Upside Down & Inside Out](https://en.wikipedia.org/wiki/Upside_Down_%26_Inside_Out) |
| パートカラー | 白黒の画面の一部だけに色を残す | [Selective color](https://en.wikipedia.org/wiki/Selective_color)、[シンドラーのリストの赤いコート](https://en.wikipedia.org/wiki/Schindler%27s_List)、[シン・シティ](https://en.wikipedia.org/wiki/Sin_City_(film)) |
| デイ・フォー・ナイト | 昼に撮って暗く青くし、夜に見せる | [Day for night](https://en.wikipedia.org/wiki/Day_for_night) |
| カラーグレーディング | 作品全体の色味を決め、肩や影の色を寄せる | [Color grading](https://en.wikipedia.org/wiki/Color_grading) |
| ブリーチバイパス | 彩度を落として硬いコントラストにする | [Bleach bypass](https://en.wikipedia.org/wiki/Bleach_bypass) |
| クロスプロセス | 現像を入れ替えたような、色のずれた濃い色味にする | [Cross processing](https://en.wikipedia.org/wiki/Cross_processing) |
| フィルムに直接描く | カメラを使わず、フィルムに引っかいたり描いたりする | [Direct animation](https://en.wikipedia.org/wiki/Direct_animation)、[Norman McLaren](https://en.wikipedia.org/wiki/Norman_McLaren) |
| 手彩色 | 白黒の写真や映像に手で色をつける | [Hand-colouring](https://en.wikipedia.org/wiki/Hand-colouring_of_photographs) |

## 照明と質感

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| キアロスクーロ | 強い明暗の対比で形を彫り出す | [Chiaroscuro](https://en.wikipedia.org/wiki/Chiaroscuro) |
| ローキー・ハイキー | 暗い部分を主にした重い画と、影の少ない明るい画を使い分ける | [Low-key lighting](https://en.wikipedia.org/wiki/Low-key_lighting)、[High-key lighting](https://en.wikipedia.org/wiki/High-key_lighting) |
| レンブラント照明 | 暗い側の頰に三角の光だけを残す | [Rembrandt lighting](https://en.wikipedia.org/wiki/Rembrandt_lighting) |
| ゴボ | 光の前に型を置き、窓枠や木漏れ日の影を投げる | [Gobo](https://en.wikipedia.org/wiki/Gobo_(lighting)) |
| ボリュメトリックライト | 空気中の光の筋を CG で描く | [Volumetric lighting](https://en.wikipedia.org/wiki/Volumetric_lighting) |
| コースティクス | 水やガラスを通った光が底や壁に揺らめく模様を作る | [Caustic](https://en.wikipedia.org/wiki/Caustic_(optics)) |
| 玉虫色 | 見る角度で虹色に変わる表面 | [Iridescence](https://en.wikipedia.org/wiki/Iridescence) |
| 半透明の肌 | 光が皮膚や軟らかい物の中で散らばり、赤く透ける | [Subsurface scattering](https://en.wikipedia.org/wiki/Subsurface_scattering) |
| 絵画風のレンダリング | 油絵や手描きの筆致で 3D や実写を描き直す | [Non-photorealistic rendering](https://en.wikipedia.org/wiki/Non-photorealistic_rendering)、[Arcane](https://en.wikipedia.org/wiki/Arcane_(TV_series))、[Loving Vincent](https://en.wikipedia.org/wiki/Loving_Vincent) |

## 文字と歌詞

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| キネティックタイポグラフィ | 文字を動かして言葉のリズムや感情を見せる | [Kinetic typography](https://en.wikipedia.org/wiki/Kinetic_typography) |
| リリックビデオ | 歌詞を主役にして曲に合わせて出す | [Lyric video](https://en.wikipedia.org/wiki/Lyric_video) |
| 手めくりの歌詞カード | 歌詞を書いた紙を一枚ずつ落としていく | [Subterranean Homesick Blues](https://en.wikipedia.org/wiki/Subterranean_Homesick_Blues) |
| タイトルシークエンス | 図形や文字だけで作品の空気を先に伝える | [Saul Bass](https://en.wikipedia.org/wiki/Saul_Bass)、[Kyle Cooper のセブン](https://en.wikipedia.org/wiki/Kyle_Cooper) |
| デジタルレイン | 縦に流れ落ちる文字の列 | [Matrix digital rain](https://en.wikipedia.org/wiki/Matrix_digital_rain) |
| 弾幕コメント | 視聴者のコメントが映像の上を流れる | [Danmaku](https://en.wikipedia.org/wiki/Danmaku_subtitling) |
| 強調テロップ | 話した言葉を大きな飾り文字で重ねて笑いを足す | [テロップ](https://ja.wikipedia.org/wiki/テロップ) |
| 文字で絵を描く | 文字の濃淡や形で映像を作る | [ASCII アート](https://en.wikipedia.org/wiki/ASCII_art) |
| 空間に置く字幕 | スマホのメッセージや考えを、画面の中の空間に文字として浮かべる | [SHERLOCK](https://en.wikipedia.org/wiki/Sherlock_(TV_series)) |
| インフォグラフィック | 数字や仕組みを図とアイコンで動かして見せる | [Infographic](https://en.wikipedia.org/wiki/Infographic) |
| タイプライターアート | 文字や記号を並べて絵を描く | [Typewriter art](https://en.wikipedia.org/wiki/Typewriter_art) |

## アニメーションの作法

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| ロトスコープ | 実写をなぞって絵にする | [a-ha の Take On Me](https://en.wikipedia.org/wiki/Take_On_Me)、[スキャナー・ダークリー](https://en.wikipedia.org/wiki/A_Scanner_Darkly_(film)) |
| コマ撮り・ピクシレーション | 人や物を一コマずつ動かして撮る | [Peter Gabriel の Sledgehammer](https://en.wikipedia.org/wiki/Sledgehammer_(Peter_Gabriel_song)) |
| クレイアニメ | 粘土を少しずつ変形させて撮る | [Clay animation](https://en.wikipedia.org/wiki/Clay_animation) |
| 切り絵アニメ | 紙や写真の切り抜きを関節ごとに動かす | [Cutout animation](https://en.wikipedia.org/wiki/Cutout_animation) |
| コマ数の打ち分け | 2 コマ打ちと 1 コマ打ちを混ぜて、動きに緩急をつける | [Limited animation](https://en.wikipedia.org/wiki/Limited_animation)、[スパイダーバース](https://en.wikipedia.org/wiki/Spider-Man:_Into_the_Spider-Verse) |
| スミア | 速い動きのコマだけ形を引き伸ばして描く | [Smear frame](https://en.wikipedia.org/wiki/Smear_frame) |
| 集中線・スピード線 | 動きや注目を線の束で示す | [集中線](https://ja.wikipedia.org/wiki/集中線)、[Speed line](https://en.wikipedia.org/wiki/Speed_line) |
| 線の震え | 毎コマ描き直して輪郭を揺らし、手描きの味を出す | [Squigglevision](https://en.wikipedia.org/wiki/Squigglevision) |
| セルシェーディング | 3D をアニメのような平塗りと輪郭で描く | [Cel shading](https://en.wikipedia.org/wiki/Cel_shading) |
| ローポリ | 少ない三角形で角ばった形を作る | [Low poly](https://en.wikipedia.org/wiki/Low_poly) |
| ボクセル | 小さな立方体を積んで形を作る | [Voxel](https://en.wikipedia.org/wiki/Voxel) |
| ワイヤーフレーム | 面を塗らず線だけで立体を見せる | [Wire-frame model](https://en.wikipedia.org/wiki/Wire-frame_model) |
| ドット絵 | 粗い画素で描き、ゲーム機の画面のように動かす | [Pixel art](https://en.wikipedia.org/wiki/Pixel_art) |
| アイソメトリック | 斜め上から見下ろした箱庭のように描く | [Isometric graphics](https://en.wikipedia.org/wiki/Isometric_video_game_graphics) |
| フラットなモーショングラフィックス | 単純な図形を伸縮や弾みで動かして説明する | [Motion graphics](https://en.wikipedia.org/wiki/Motion_graphics) |
| ゾートロープ | 回転と明滅で並んだ立体を動いて見せる | [Zoetrope](https://en.wikipedia.org/wiki/Zoetrope) |
| 砂アニメーション | ライトボックスの上の砂を指で崩しながら描き変える | [Sand animation](https://en.wikipedia.org/wiki/Sand_animation) |
| ガラスに描くアニメーション | ガラス板の油絵具を拭っては描き足し、一枚の絵を変形させ続ける | [Paint-on-glass animation](https://en.wikipedia.org/wiki/Paint-on-glass_animation) |
| ピンスクリーン | 無数のピンの出し入れで影の濃淡を作る | [Pinscreen animation](https://en.wikipedia.org/wiki/Pinscreen_animation) |
| 切り絵の影絵アニメーション | 黒い切り絵を裏から照らし、シルエットだけで演じさせる | [Silhouette animation](https://en.wikipedia.org/wiki/Silhouette_animation)、[Lotte Reiniger](https://en.wikipedia.org/wiki/Lotte_Reiniger) |
| 影絵 | 手や人形の影をスクリーンに映して物語る | [Shadow play](https://en.wikipedia.org/wiki/Shadow_play) |
| パラパラ漫画 | 紙の束をめくって動きを見せる | [Flip book](https://en.wikipedia.org/wiki/Flip_book) |
| ホワイトボードアニメーション | 手が絵や文字を描いていく様子をそのまま説明に使う | [Whiteboard animation](https://en.wikipedia.org/wiki/Whiteboard_animation) |

## アニメの撮影処理と演出の作法

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| 透過光（T光） | 光る部分を裏から光を当てたように輝かせる。アニメで最も多く使われる光の処理 | [総務省の報告書](https://www.soumu.go.jp/johotsusintokei/whitepaper/ja/h11/press/japanese/housou/0626j14.htm)、[アニメスタイルの撮影講座](https://animestyle.jp/2016/03/07/9837/)、[ポケモンショック](https://ja.wikipedia.org/wiki/ポケモンショック) |
| ピンホール透過光・クロス透過光 | 星のまたたきや飛び散る汗を点の光にし、十字に光らせる。たくさん重ねると「キラキラ」になる | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| すだれ引き・波チラ | 光をゆらゆら、ちらちらと変化させ、遠くの海面などを光らせる | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| 入射光・環境光 | 画面の外の光源から差し込む光やハレーションを足し、空気や時間帯を出す | [小倉健太郎の論文](https://seijo.repo.nii.ac.jp/record/3687/files/233-234-3.pdf)、[アニメスタイルの撮影講座](https://animestyle.jp/2016/03/07/9837/) |
| レンズフレア・ゴースト | 強い光源からレンズ内の反射でできる光の輪や玉を足す | [アニメスタイルの撮影講座](https://animestyle.jp/2016/03/07/9837/) |
| 横一直線のフレア | アナモルフィックレンズ由来の、横に長く伸びる光の線 | [アニメスタイルの撮影講座](https://animestyle.jp/2016/03/07/9837/)（〈物語〉シリーズの例） |
| 十字光 | 光源から十字に伸びる光。ギャグでは回転しながら出る | [アニメスタイルの撮影講座](https://animestyle.jp/2016/03/07/9837/) |
| 丸ボケ | 点光源を丸くぼかす。絞りの形を変えてハートや星の形にもする | [アニメスタイルの撮影講座](https://animestyle.jp/2016/03/07/9837/) |
| オーブ | 空中のちりやレンズのほこりがぼけて白い玉に映る | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| パラ | 色付きの透明な紙をカメラ前にかざしたように、グラデーションの影や照り返しをかぶせる | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110)、[BLUE PROTOCOL の CEDEC 講演記事](https://cgworld.jp/feature/202011-cedec2020-bluep-2.html) |
| ディフュージョン（DF） | 明るい部分を柔らかく拡散させ、湯気や朝の空気を出す | [アニメスタイルの撮影講座](https://animestyle.jp/2016/03/07/9837/)、[Soft focus](https://en.wikipedia.org/wiki/Soft_focus) |
| グローアウト | 光を浴びて白飛びしたように画面が消えていく | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| フォギーフィルター | 霧の中で撮ったように全体を白くかすませる | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| フラクタルノイズの湯気・霧 | ランダムなムラ模様を動かして湯気、霧、砂ぼこり、雲を作る | [アニメスタイルの撮影講座](https://animestyle.jp/2016/03/07/9837/) |
| 光芒・チンダル現象 | 雲や窓から差す光の筋、ほこりっぽい空気に見える光の帯を足す | [Crepuscular rays](https://en.wikipedia.org/wiki/Crepuscular_rays)、[新海誠](https://en.wikipedia.org/wiki/Makoto_Shinkai)、[うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| 空気遠近 | 遠い背景ほど色を薄く青くして奥行きを出す | [Aerial perspective](https://en.wikipedia.org/wiki/Aerial_perspective) |
| 波ガラス | 画面全体を波のようにゆらめかせ、陽炎、水中、回想への入りを表す | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| ストリームブラー・ラジアルブラー | 平行線や放射状のブラーで風やスピード、視線の集中を出す | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| 画面動 | フレームを小刻みに揺らし、爆発、地震、心の動揺を伝える | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| ポン寄り・ポン引き | ズームの途中を省き、一瞬で寄る・引く | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| クイック T.B | 回転を加えながら一気に引き、最後に減速する | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| 密着マルチ・回り込み風 | 手前と奥の素材を別の速さで引き、カメラが回り込むように見せる | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| ゴンドラ T.U | 背景だけを寄せて、人物はそのままにする | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| マルチプレーン | 背景を何層かに分けて重ね、層ごとに動かして奥行きを出す | [Multiplane camera](https://en.wikipedia.org/wiki/Multiplane_camera) |
| 白コマ・黒コマ・サブリミナル | 1 コマだけ白や黒、別の絵を挟んで衝撃を与える | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| フリッカー | 絵を細かく入れ替えて震えやちらつきを出す | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| なめだし | 線が描かれていくように画面が現れる | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| オバケ作画 | 残像のような絵を挟んで素早い動きを表す | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| タタキ | 白い絵の具を飛ばしたような点で光や勢いを出す | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| 止め絵の口パク | 一枚絵のまま口や目だけを動かす | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| 荒木なびき | 髪や布が特徴的な繰り返しの形でなびく | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| 漫符・デフォルメ | 汗や怒りの記号、崩した頭身で感情を表す | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| 線影・BL 影 | 線の影や真っ黒な影で漫画やアメコミのような陰影を出す | [うさペンの撮影処理まとめ](https://usapen3.hatenablog.com/entry/2016/12/18/234110) |
| 金田パース・金田光り | 極端な遠近と独特の形の光で動きを誇張する | [金田伊功](https://ja.wikipedia.org/wiki/金田伊功) |
| 板野サーカス | 大量のミサイルが煙を引いて飛び交い、カメラも一緒に飛ぶ | [板野一郎](https://en.wikipedia.org/wiki/Ichir%C5%8D_Itano) |
| 出崎演出 | 止め絵の劇画（ハーモニー）、同じカットの繰り返し、画面の分割 | [出崎統](https://ja.wikipedia.org/wiki/出崎統) |
| シャフト演出 | 首を大きくかしげる振り向き、文字だけのカット、大胆な幾何学的レイアウト | [Shaft](https://en.wikipedia.org/wiki/Shaft_(company)) |
| スキャニメイト | 走査線をゆがませて文字や図形を動かす初期のアナログ CG | [井上ジェットのカメラワーク大辞典](https://www.inouejet.com/camera/) |
| MMD | 配布されたモデルとモーションで 3D のキャラを踊らせる | [MikuMikuDance](https://en.wikipedia.org/wiki/MikuMikuDance) |

## 生成とリアルタイム描画

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| ビデオフィードバック | 出力を入力に戻して、無限に続く残像や渦を作る | [Video feedback](https://en.wikipedia.org/wiki/Video_feedback)、[Bohemian Rhapsody の顔が連なる場面](https://en.wikipedia.org/wiki/Bohemian_Rhapsody) |
| アナログビデオシンセ | 信号を直接いじって色や形を作る | [Video synthesizer](https://en.wikipedia.org/wiki/Video_synthesizer)、[ナム・ジュン・パイク](https://en.wikipedia.org/wiki/Nam_June_Paik) |
| パーティクル | 大量の粒を物理や音で動かす | [Particle system](https://en.wikipedia.org/wiki/Particle_system) |
| 流体 | 煙や液体の流れを計算して描く | [Fluid animation](https://en.wikipedia.org/wiki/Fluid_animation) |
| ノイズ・フローフィールド | 滑らかな乱数の場に沿って線や粒を流す | [Perlin noise](https://en.wikipedia.org/wiki/Perlin_noise) |
| ディスプレースメント | 別の画像や音の値で面や画素を押し出し、ゆがませる | [Displacement mapping](https://en.wikipedia.org/wiki/Displacement_mapping) |
| レイマーチングとシェーダー | 数式だけで立体や空間を描く | [Ray marching](https://en.wikipedia.org/wiki/Ray_marching)、[Shadertoy](https://en.wikipedia.org/wiki/Shadertoy) |
| フラクタル | 自己相似の形に潜り込んでいく | [Mandelbulb](https://en.wikipedia.org/wiki/Mandelbulb) |
| 反応拡散 | 生き物の模様のように斑点や縞が育つ | [Reaction-diffusion](https://en.wikipedia.org/wiki/Reaction%E2%80%93diffusion_system) |
| セル・オートマトン | 格子の周りの状態だけで次の状態を決める | [ライフゲーム](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) |
| 群れ | 鳥や魚の群れのように大量の個体を動かす | [Boids](https://en.wikipedia.org/wiki/Boids) |
| L システム | 規則の繰り返しで枝や植物を育てる | [L-system](https://en.wikipedia.org/wiki/L-system) |
| ボロノイ | 点からの距離で細胞やひび割れのような区切りを作る | [Voronoi diagram](https://en.wikipedia.org/wiki/Voronoi_diagram) |
| リサージュ曲線 | 2 つの振動からなる結び目のような線 | [Lissajous curve](https://en.wikipedia.org/wiki/Lissajous_curve) |
| プラズマ | 波を重ねた虹色のゆらめき | [Plasma effect](https://en.wikipedia.org/wiki/Plasma_effect) |
| ラスターバー | 走査線ごとに色を変えた横縞を揺らす | [Raster bars](https://en.wikipedia.org/wiki/Raster_bars) |
| デモシーン | 小さなプログラムで音と映像を即席に描いて競う | [Demoscene](https://en.wikipedia.org/wiki/Demoscene)、[Second Reality](https://en.wikipedia.org/wiki/Second_Reality) |
| オプアート・モアレ | 縞や格子の干渉で目の錯覚を起こす | [Op art](https://en.wikipedia.org/wiki/Op_art) |
| データの可視化 | 数値や符号をそのまま高速な白黒の図形にする | [池田亮司](https://en.wikipedia.org/wiki/Ryoji_Ikeda) |
| ライブコーディング | 演奏中にコードを書き換えて映像を作る | [Hydra](https://hydra.ojack.xyz/)、[Live coding](https://en.wikipedia.org/wiki/Live_coding) |
| ジェネラティブアート | 規則と乱数から毎回違う絵を作る | [Generative art](https://en.wikipedia.org/wiki/Generative_art) |
| 写真モザイク | たくさんの小さな画像を並べて一枚の絵にする | [Photographic mosaic](https://en.wikipedia.org/wiki/Photographic_mosaic) |
| メタボール | 近づくと溶け合う玉 | [Metaballs](https://en.wikipedia.org/wiki/Metaballs) |
| ストレンジアトラクター | 方程式の軌道が描く蝶のような線 | [Lorenz system](https://en.wikipedia.org/wiki/Lorenz_system) |
| ハーモノグラフ・スピログラフ | 振り子や歯車の組み合わせで幾何学の線を描く | [Harmonograph](https://en.wikipedia.org/wiki/Harmonograph)、[Spirograph](https://en.wikipedia.org/wiki/Spirograph) |
| 落ち砂 | 一粒ずつの砂や水が流れて積もる | [Falling-sand game](https://en.wikipedia.org/wiki/Falling-sand_game) |
| トルシェ・タイル | 数種類のタイルをランダムに並べて迷路や波を作る | [Truchet tiles](https://en.wikipedia.org/wiki/Truchet_tiles) |
| 平面充填 | 同じ形の敷き詰めを少しずつ変形させていく | [Tessellation](https://en.wikipedia.org/wiki/Tessellation) |
| 点描 | 点の密度で明暗を描く | [Stippling](https://en.wikipedia.org/wiki/Stippling) |
| ストリングアート | 円周の釘の間に糸を張るように、直線の重なりで絵を描く | [String art](https://en.wikipedia.org/wiki/String_art) |
| 超立方体 | 4 次元の立方体を回して 3 次元に投影する | [Tesseract](https://en.wikipedia.org/wiki/Tesseract) |
| 画像のワープ | 画像を座標ごとねじったり渦を巻かせたりして流す | [Image warping](https://en.wikipedia.org/wiki/Image_warping) |
| フラクタルフレーム | 反復関数系で炎のような光の模様を生み、少しずつ変形させる | [Fractal flame](https://en.wikipedia.org/wiki/Fractal_flame)、[Electric Sheep](https://en.wikipedia.org/wiki/Electric_Sheep) |
| サイケデリック | 極彩色、渦、溶ける模様で酩酊感を出す | [Psychedelic art](https://en.wikipedia.org/wiki/Psychedelic_art) |
| 曼荼羅と神聖幾何学 | 中心から対称に広がる幾何学模様を回す | [Mandala](https://en.wikipedia.org/wiki/Mandala)、[Sacred geometry](https://en.wikipedia.org/wiki/Sacred_geometry) |
| プロシージャル生成 | 規則と乱数から地形や模様を無限に作る | [Procedural generation](https://en.wikipedia.org/wiki/Procedural_generation) |

## 3D モーショングラフィックス

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| クローナーとエフェクター | 一つの形を格子や円に大量に複製し、波や音で位置と大きさを動かす | [Unreal Engine のクローナー](https://dev.epicgames.com/documentation/unreal-engine/motion-design-cloners-and-effectors-in-unreal-engine)、[TouchDesigner のインスタンシング](https://derivative.ca/tags/instancing) |
| 膨らんだ 3D | 空気で膨らんだような、ぷにぷにした形 | [LottieFiles のトレンド記事](https://lottiefiles.com/blog/design-inspiration/animation-and-motion-design-trends-2024) |
| ベントーグリッド | 角の丸い箱を格子に並べて情報を見せる | [LottieFiles のトレンド記事](https://lottiefiles.com/blog/design-inspiration/animation-and-motion-design-trends-2024) |
| ソフトボディ・布 | 柔らかい物体や布を物理で揺らす | [Soft-body dynamics](https://en.wikipedia.org/wiki/Soft-body_dynamics) |
| 剛体シミュレーション | 物を割ったり崩したりして破片を物理で散らす | [Rigid body dynamics](https://en.wikipedia.org/wiki/Rigid_body_dynamics) |
| 気持ちいい映像 | 切る、潰す、ぴったりはまる動きをループさせる | [Oddly satisfying](https://en.wikipedia.org/wiki/Oddly_satisfying) |

## 音と映像の同期

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| 音声反応 | 音の大きさや周波数で映像の動きを決める | [Music visualization](https://en.wikipedia.org/wiki/Music_visualization) |
| スペクトラム表示 | 周波数ごとの棒や円を曲に合わせて伸び縮みさせる | [Spectrum analyzer](https://en.wikipedia.org/wiki/Spectrum_analyzer) |
| スペクトログラム | 時間と周波数の平面に音を絵として描く | [Spectrogram](https://en.wikipedia.org/wiki/Spectrogram) |
| 波形の山並み | 連続した波形を少しずつずらして重ね、山脈のように見せる | [Unknown Pleasures のジャケット](https://en.wikipedia.org/wiki/Unknown_Pleasures) |
| オシロスコープ・ミュージック | 左右の音の波形そのもので絵を描く | [Oscilloscope music](https://en.wikipedia.org/wiki/Oscilloscope_music) |
| サイマティクス | 音の振動で水や砂に模様を浮かび上がらせる | [Cymatics](https://en.wikipedia.org/wiki/Cymatics) |
| ビジュアルミュージック | 抽象的な形と色を音楽のように組み立てる | [Visual music](https://en.wikipedia.org/wiki/Visual_music)、[Oskar Fischinger](https://en.wikipedia.org/wiki/Oskar_Fischinger)、[ファンタジア](https://en.wikipedia.org/wiki/Fantasia_(1940_film)) |
| 楽譜の可視化 | ピアノロールや図形で音符の流れを見せる | [Stephen Malinowski](https://en.wikipedia.org/wiki/Stephen_Malinowski)、[Synthesia](https://en.wikipedia.org/wiki/Synthesia_(video_game)) |
| 楽器ごとの対応 | 音を出す仕掛けや図形を楽器ごとに用意して音と同時に動かす | [Animusic](https://en.wikipedia.org/wiki/Animusic) |
| 風景を楽譜にする | 車窓を流れる建物などを曲の音に合わせて並べる | [Chemical Brothers の Star Guitar](https://en.wikipedia.org/wiki/Star_Guitar)、[Michel Gondry](https://en.wikipedia.org/wiki/Michel_Gondry) |
| ライトオルガン・カラーオルガン | 音の高さや大きさで照明の色を変える | [Light organ](https://en.wikipedia.org/wiki/Light_organ)、[Color organ](https://en.wikipedia.org/wiki/Color_organ) |
| 噴水ショー | 水の動きと照明を曲に合わせる | [Musical fountain](https://en.wikipedia.org/wiki/Musical_fountain)、[ベラージオ](https://en.wikipedia.org/wiki/Bellagio_(resort)) |
| 音MAD・YTPMV | 素材の声や音を音程に合わせて切り貼りし、曲にする | [音MAD](https://ja.wikipedia.org/wiki/音MAD)、[YouTube Poop](https://en.wikipedia.org/wiki/YouTube_poop) |
| MAD・AMV | 既存のアニメや映画の場面を曲に合わせて編集する | [Anime music video](https://en.wikipedia.org/wiki/Anime_music_video) |
| 作業用 BGM のループ絵 | 一枚絵を少しだけ動かし続けて曲を流す | [Lofi Girl](https://en.wikipedia.org/wiki/Lofi_Girl) |
| 音楽プレイヤーのビジュアライザー | 再生中の曲に合わせて模様が流れ続ける | [Winamp](https://en.wikipedia.org/wiki/Winamp)、[MilkDrop](https://en.wikipedia.org/wiki/MilkDrop) |

## VJ の現場の操作

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| ループ素材の重ね合わせ | 短い繰り返しの映像を何層も重ね、その場で切り替える | [VJing](https://en.wikipedia.org/wiki/VJing) |
| 合成モード | 加算・スクリーン・乗算・差分などでレイヤーを混ぜる | [Resolume の解説](https://resolume.com/support/en/blend-modes)、[Blend modes](https://en.wikipedia.org/wiki/Blend_modes) |
| カットとタイムスイッチ | 混ぜずに硬く切り替える、または 2 つのレイヤーを拍に合わせて交互に出す | [Resolume の解説](https://resolume.com/support/en/blend-modes) |
| BPM 同期 | 素材の再生速度やエフェクトの周期を曲の BPM に合わせる | [GrandVJ XT](https://vj.arkaos.com/node/335) |
| MIDI コントローラーでの演奏 | つまみや鍵盤にエフェクトを割り当て、楽器のように手で操る | [MIDI controller](https://en.wikipedia.org/wiki/MIDI_controller) |
| タイムコード同期 | 曲の再生位置に映像と照明を合わせ、完全に決め打ちで出す | [SMPTE timecode](https://en.wikipedia.org/wiki/SMPTE_timecode) |
| ピクセルマッピング | LED や照明の一つ一つを画素とみなして映像を流す | [VU Studio のマニュアル](https://docs.vu.studio/docs/user-guide/pixel-mapping)、[Art-Net](https://en.wikipedia.org/wiki/Art-Net) |
| 照明との連動 | 映像の色や拍で DMX の照明を動かす | [DMX512](https://en.wikipedia.org/wiki/DMX512) |
| 映像の受け渡し | ソフト間や PC 間で映像をその場で渡して重ねる | [NDI](https://en.wikipedia.org/wiki/Network_Device_Interface) |
| 演者のライブカメラ加工 | 会場で撮った演者の映像に、その場でエフェクトを掛けて大画面に出す | [Image magnification](https://en.wikipedia.org/wiki/Image_magnification)、[TouchDesigner のエッジとフィードバック](https://derivative.ca/community-post/tutorial/create-edge-feedback-concert-visuals/75058) |

## AI と 3D 取り込み

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| 画風変換 | 映像を別の絵の画風で描き直す | [Neural style transfer](https://en.wikipedia.org/wiki/Neural_style_transfer) |
| 拡散モデルの連続生成 | 前の絵を元に次の絵を生成し続け、溶けるように変わっていく | [Stable Diffusion](https://en.wikipedia.org/wiki/Stable_Diffusion) |
| 動画生成 | 文章から動画を生成する | [Text-to-video model](https://en.wikipedia.org/wiki/Text-to-video_model) |
| 顔の差し替え | 人の顔や口の動きを別人にする | [Deepfake](https://en.wikipedia.org/wiki/Deepfake) |
| 点群 | 深度センサーやスキャンで得た点の集まりで人や場所を描く | [Radiohead の House of Cards](https://en.wikipedia.org/wiki/House_of_Cards_(Radiohead_song)) |
| フォトグラメトリ | たくさんの写真から立体を復元する | [Photogrammetry](https://en.wikipedia.org/wiki/Photogrammetry) |
| NeRF・Gaussian splatting | 写真から光の場を学習し、実写の空間を自由な視点で飛び回る | [NeRF](https://en.wikipedia.org/wiki/Neural_radiance_field)、[Gaussian splatting](https://en.wikipedia.org/wiki/Gaussian_splatting) |
| ボリュメトリックキャプチャ | 人を多方向から撮って、動く立体として取り込む | [Volumetric capture](https://en.wikipedia.org/wiki/Volumetric_capture) |
| モーションキャプチャ | 人の動きを取り込んで CG の体に移す | [Motion capture](https://en.wikipedia.org/wiki/Motion_capture)、[VTuber](https://en.wikipedia.org/wiki/VTuber) |
| 体の追跡 | カメラや深度センサーで人の形を拾い、映像を体にまとわせる | [Kinect](https://en.wikipedia.org/wiki/Kinect)、[ライゾマティクス](https://en.wikipedia.org/wiki/Rhizomatiks) |
| オプティカルフロー | 画素の動きの向きを求め、動きに沿って粒や色を流す | [Optical flow](https://en.wikipedia.org/wiki/Optical_flow) |
| 切り抜き | 人や物を自動で背景から切り離し、合成や差し替えに使う | [Image segmentation](https://en.wikipedia.org/wiki/Image_segmentation) |
| 深度推定 | 一枚の絵から奥行きを推定し、写真を立体的に動かす | [Depth map](https://en.wikipedia.org/wiki/Depth_map) |
| 超解像 | 低解像度の映像を大きく描き直す | [Super-resolution imaging](https://en.wikipedia.org/wiki/Super-resolution_imaging) |

## 空間・舞台・ライブ

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| プロジェクションマッピング | 建物や物の形に合わせて映像を投影する | [Projection mapping](https://en.wikipedia.org/wiki/Projection_mapping) |
| 没入型の投影空間 | 壁と床の全面に映像を流し、人の動きに反応させる | [teamLab](https://en.wikipedia.org/wiki/TeamLab) |
| 球体・巨大 LED | 会場そのものを映像で包む | [Sphere](https://en.wikipedia.org/wiki/Sphere_(venue)) |
| 錯視ビジョン | 曲がった画面と角度で、立体が飛び出して見える | [新宿の 3D 猫](https://ja.wikipedia.org/wiki/クロス新宿ビジョン)、[Anamorphosis](https://en.wikipedia.org/wiki/Anamorphosis) |
| ペッパーズ・ゴースト | 斜めの透明な板に映して、舞台に人がいるように見せる | [Pepper's ghost](https://en.wikipedia.org/wiki/Pepper%27s_ghost) |
| 透過スクリーンのバーチャルライブ | 舞台前の透明な幕に CG の歌い手を映し、生バンドと共演させる | [マジカルミライ](https://ja.wikipedia.org/wiki/マジカルミライ)、[Miku Expo](https://en.wikipedia.org/wiki/Hatsune_Miku_Expo) |
| LED ボリューム | LED の壁に背景を映し、その前で撮影する | [StageCraft](https://en.wikipedia.org/wiki/StageCraft) |
| レーザー | 線や面の光を空間に描く | [Laser lighting display](https://en.wikipedia.org/wiki/Laser_lighting_display) |
| ドローンショー | 光るドローンの群れで夜空に絵を描く | [Drone light show](https://en.wikipedia.org/wiki/Drone_light_show) |
| インフィニティミラー | 向かい合う鏡で光を無限に続かせる | [Infinity mirror](https://en.wikipedia.org/wiki/Infinity_mirror) |
| リキッドライトショー | 色のついた液体を OHP で投影し、曲に合わせて揺らす | [Liquid light show](https://en.wikipedia.org/wiki/Liquid_light_show)、[Joshua Light Show](https://en.wikipedia.org/wiki/Joshua_Light_Show) |
| 360 度動画 | 見る人が向きを選べる全方位の映像 | [360-degree video](https://en.wikipedia.org/wiki/360-degree_video) |
| 立体視 | 左右の目に違う映像を見せて奥行きを出す | [Stereoscopy](https://en.wikipedia.org/wiki/Stereoscopy)、[アナグリフ](https://en.wikipedia.org/wiki/Anaglyph_3D) |
| AR 演出 | 中継映像の中で CG のキャラや物を会場に出現させる | [K/DA の Worlds 開会式](https://en.wikipedia.org/wiki/K/DA) |
| ボリュメトリックディスプレイ | 空間そのものに光の点を出して立体を描く | [Volumetric display](https://en.wikipedia.org/wiki/Volumetric_display) |
| 無線制御のリストバンド | 観客の腕のライトを曲に合わせて一斉に光らせる | [Xyloband](https://en.wikipedia.org/wiki/Xyloband) |
| 拡張映画 | 複数の映写機、生演奏、空間全体を使ってスクリーンの外へ広げる | [Expanded cinema](https://en.wikipedia.org/wiki/Expanded_cinema) |
| マルチスクリーン | 横に並べた複数の画面を一つの視野として使う | [Multi-screen](https://en.wikipedia.org/wiki/Multi-screen)、[Cinerama](https://en.wikipedia.org/wiki/Cinerama) |
| ドーム投影 | 半球の天井一面に映し、包まれる体験にする | [Fulldome](https://en.wikipedia.org/wiki/Fulldome)、[Planetarium](https://en.wikipedia.org/wiki/Planetarium) |
| 巨大スクリーン | 視野を覆う大きさと高解像度で没入させる | [IMAX](https://en.wikipedia.org/wiki/IMAX) |

## ライブ・舞台の特殊効果

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| 紙吹雪とストリーマー | サビや終演で客席に紙やテープを打ち出す | [Artistry in Motion の演出効果](https://www.artistryinmotion.com/event-solutions/concert-theatrical-effects/) |
| CO2 ジェット | 白い噴射を床から一瞬だけ吹き上げる | [Gearsource の機材一覧](https://gearsource.com/category/cannons-pyro) |
| 火柱と花火 | 舞台の上で炎や火花を音に合わせて上げる | [Pyrotechnics](https://en.wikipedia.org/wiki/Pyrotechnics) |
| スモークとヘイズ | 煙で光の筋を見せ、低く這う霧で雲の上を作る | [Fog machine](https://en.wikipedia.org/wiki/Fog_machine)、[Haze machine](https://en.wikipedia.org/wiki/Haze_machine) |
| カブキドロップ | 吊った幕を一瞬で落として舞台を現す | [Kylie のツアーの解説](https://www.tpimagazine.com/electro-kabuki-flops-drops-streamers-for-kylie-on-golden-tour/) |
| ムービングライト | 首を振る照明で光の束を動かし、形を描く | [Intelligent lighting](https://en.wikipedia.org/wiki/Intelligent_lighting) |
| フォロースポット | 人が操る強い光で演者を追い続ける | [Followspot](https://en.wikipedia.org/wiki/Followspot) |
| 紗幕 | 前から照らすと絵、後ろを照らすと透ける幕に映像を重ねる | [Scrim](https://en.wikipedia.org/wiki/Scrim_(material)) |
| せりと回り舞台 | 床ごと演者をせり上げたり、舞台を回して場面を替える | [Stage lift](https://en.wikipedia.org/wiki/Stage_lift)、[Revolving stage](https://en.wikipedia.org/wiki/Revolving_stage) |
| キネティック装置 | 吊った玉や板を機械で動かし、形を変えていく | [Kinetic art](https://en.wikipedia.org/wiki/Kinetic_art) |

## 美学とネット文化

単独の技法より、上の手法を決まった組み合わせで使う「らしさ」を集めた。

| 美学 | 構成する手法 | 実例 |
| --- | --- | --- |
| ヴェイパーウェイヴ | VHS のにじみ、古い CG、パステル色、彫刻とヤシの木 | [Vaporwave](https://en.wikipedia.org/wiki/Vaporwave) |
| シンセウェイヴ | ワイヤーフレームの地面、横縞の入った夕日、ネオン | [Synthwave](https://en.wikipedia.org/wiki/Synthwave) |
| サイバーパンク | ネオン、雨と反射、浮かぶ UI、グリッチ | [Cyberpunk](https://en.wikipedia.org/wiki/Cyberpunk) |
| Y2K | クロームの金属質、半透明のプラスチック、低解像度 3D | [Y2K aesthetic](https://en.wikipedia.org/wiki/Y2K_aesthetic) |
| フルティガー・エアロ | 光沢、水と泡、空と緑、半透明のガラス | [Frutiger Aero](https://en.wikipedia.org/wiki/Frutiger_Aero) |
| アナログホラー | 撮りっぱなしの VHS、放送事故風のテロップ、低解像度 | [Analog horror](https://en.wikipedia.org/wiki/Analog_horror) |
| YouTube Poop | 短い繰り返し、逆再生、音程いじり、色の反転を詰め込む | [YouTube Poop](https://en.wikipedia.org/wiki/YouTube_poop) |
| リミナルスペース | 誰もいない蛍光灯の空間、少しずれた既視感 | [Liminal space](https://en.wikipedia.org/wiki/Liminal_space_(aesthetic))、[The Backrooms](https://en.wikipedia.org/wiki/The_Backrooms) |
| グリッチコア | 過剰なグリッチ、彩度、ノイズ、早口の切り貼り | [Glitchcore](https://en.wikipedia.org/wiki/Glitchcore) |
| コアコア | 無関係な映像の断片を音楽でつなぎ、感情だけを伝える | [Corecore](https://en.wikipedia.org/wiki/Corecore) |
| シーパンク | 90 年代の CG、水、イルカ、青緑のネオン | [Seapunk](https://en.wikipedia.org/wiki/Seapunk) |

## ショート動画とネット動画の作法

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| 手で隠して切り替え | 手や物でレンズをふさいだ瞬間に、場所や服を変える | [Kapwing の解説](https://kapwing.com/resources/how-to-do-transitions-on-tiktok) |
| 手で払う | 手を画面に横切らせて次のクリップを出す | [Ball State Daily の解説](https://ballstatedaily.com/article/2024/10/overview-of-popular-transitions-on-instagram-and-tiktok) |
| 指パッチン・頭で押し出す | 指を鳴らした瞬間や、頭が画面を覆う動きで切り替える | [Nestscale の解説](https://nestscale.com/blog/easy-tiktok-transitions.html) |
| カメラ 180 度回し | スマホを頭上で振り回して場面をつなぐ | [Ball State Daily の解説](https://ballstatedaily.com/article/2024/10/overview-of-popular-transitions-on-instagram-and-tiktok) |
| ベロシティ編集 | 速さを急に上げ下げし、揺れとブラーを足して曲に合わせる | [CapCut の解説](https://www.capcut.com/explore/velocity-edit-alight-motion) |
| 終わりの無いループ | 最後のコマが最初につながり、どこが切れ目か分からない | [Vine](https://en.wikipedia.org/wiki/Vine_(service)) |
| 踊ってみた | 既存曲の振り付けを踊って撮る | [踊ってみた](https://ja.wikipedia.org/wiki/踊ってみた) |
| ゆっくり解説 | 合成音声のキャラ 2 人の掛け合いで解説する | [ゆっくり実況](https://ja.wikipedia.org/wiki/ゆっくり実況) |

## ゲーム画面の演出

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| 被弾の点滅 | 攻撃を受けた物を白や赤に一瞬光らせ、当たったことを伝える | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| ヒットストップ | 当たった瞬間だけ両者の動きを数フレーム止め、重さを出す | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| ノックバック | 当たった相手を少し後ろへはじき飛ばす | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| 画面揺れ | 爆発や着地で画面全体を短く揺らす | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| 着弾の火花と破片 | 当たった場所から火花や破片を散らす | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| 衝撃波の輪 | 爆心から広がる輪で画面をゆがませる | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| 足元の砂煙 | 走り出しや着地で足元に小さな煙を出す | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| マズルフラッシュ | 撃った瞬間だけ銃口に光を一コマ出す | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| 残る煙と薬莢 | 撃った後に煙をしばらく残し、薬莢を落として床に積もらせる | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| メニュー選択の強調 | 選んだ項目を拡大したり跳ねさせたりする | [Mega Cat の Juice Guide](https://megacatstudios.com/blogs/game-development/mega-cat-developer-juice-guide-v1-0-08-23-17) |
| CRT フィルター | 走査線とにじみでブラウン管の画面を再現する | [CRT Filter](https://redinvader.itch.io/crtfilter) |
| バレットタイム操作 | 遊んでいる最中に時間を遅くして狙いを付けさせる | [Max Payne](https://en.wikipedia.org/wiki/Max_Payne) |
| カットイン | 必殺技の前に顔や決めポーズの絵を画面に割り込ませる | [カットイン](https://ja.wikipedia.org/wiki/カットイン) |
| マシニマ | ゲームのエンジンを撮影所にして映像作品を作る | [Machinima](https://en.wikipedia.org/wiki/Machinima) |
| 実況プレイ | 遊ぶ画面に本人の声や顔を重ねて見せる | [Let's Play](https://en.wikipedia.org/wiki/Let%27s_Play) |

## 広告の定番

| 手法 | 説明 | 実例 |
| --- | --- | --- |
| ヒーローショット | 商品を真ん中に置き、光と回転で一番よく見える角度を見せる | [invideo の商品動画の解説](https://invideo.io/blog/how-to-create-commercial-product-video/) |
| 注ぎと飛沫 | 飲み物を注ぐ、果物が水に落ちる瞬間をハイスピードで撮る | [invideo の商品動画の解説](https://invideo.io/blog/how-to-create-commercial-product-video/) |
| マクロ撮影 | 素材の質感や泡を肉眼より大きく見せる | [Macro photography](https://en.wikipedia.org/wiki/Macro_photography) |
| 分解図 | 製品の部品を宙に浮かせて分解し、また組み上げる | [Exploded-view drawing](https://en.wikipedia.org/wiki/Exploded-view_drawing) |
| 使用者の証言 | 利用者が顔を出して感想を語る | [Testimonial](https://en.wikipedia.org/wiki/Testimonial) |
| サウンドロゴ | 最後に数秒の決まった音とロゴを出す | [Sonic branding](https://en.wikipedia.org/wiki/Sonic_branding) |
| 開封動画 | 箱を開けて中身を一つずつ取り出す | [Unboxing](https://en.wikipedia.org/wiki/Unboxing) |
| ASMR 広告 | 咀嚼音や包装を開ける音を大きく聞かせる | [ASMR](https://en.wikipedia.org/wiki/Autonomous_sensory_meridian_response) |
| プロダクトプレイスメント | 作品の中に商品をさりげなく映す | [Product placement](https://en.wikipedia.org/wiki/Product_placement) |
