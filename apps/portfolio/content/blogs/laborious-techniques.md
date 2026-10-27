---
title: "印象的だけど作るのが大変な表現技法"
description: "仕組みは単純で広く知られているのに、手で作ると労力がかかりすぎる表現技法と、今の計算機やモデルで作るときの手段のメモ。"
tags: ["表現技法", "ジェネラティブアート"]
published: true
---

## 素材を並べて絵にする

### フォトモザイク

![フランツ・マルクの「青い馬」を写真で組んだフォトモザイク](https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Franz_Marc_Blue_Horse_1911_Photomosaic.jpg/960px-Franz_Marc_Blue_Horse_1911_Photomosaic.jpg)

画像: [Franz Marc Blue Horse 1911 Photomosaic](https://commons.wikimedia.org/wiki/File:Franz_Marc_Blue_Horse_1911_Photomosaic.jpg)（F7a8、CC BY-SA 4.0）

素材を 1 回ずつしか使わない縛りで、何千枚もの割り当てを決める。今は、色の距離を費用にした割り当て問題として最適解を解く。Web では、ズームできるビューアで、引くと絵、寄るとすべて素材に見せる。

### 動くフォトモザイク

::youtube[Animated photo mosaic: Barbarella]{id="m4zhylt2nMk"}

フレームごとに割り当てを解き直し、マスの中身も動画にする。今は、フレームごとの割り当てを、前のフレームとの差を罰にして解く。Web では、動画として再生し、一時停止したマスの元の素材へ飛べるようにする。

### 点描

![スーラ「グランド・ジャット島の日曜日の午後」](https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/960px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg)

画像: [A Sunday on La Grande Jatte, Georges Seurat, 1884](https://commons.wikimedia.org/wiki/File:A_Sunday_on_La_Grande_Jatte,_Georges_Seurat,_1884.jpg)（ジョルジュ・スーラ、パブリックドメイン）

::youtube[Time-Lapse Stippling of James Dean]{id="dTxPAIh7RV0"}

数万の点を濃淡に合わせて手で打つ。今は、重み付きボロノイ図で点を配置する。Web では、点が散った状態から集まって絵になるアニメーションを作る。

### カリグラム

![アポリネールのカリグラム](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Calligramme.svg/960px-Calligramme.svg.png)

画像: [Calligramme.svg](https://commons.wikimedia.org/wiki/File:Calligramme.svg)（ギヨーム・アポリネール、パブリックドメイン）

形に沿って文字の大きさと流れを合わせる。今は、文字の配置を最適化する。長い文章でも自動で形に流し込める。Web では、引くと絵、寄ると全文が読める SVG にする。

### アルチンボルドの寄せ絵

![アルチンボルド「ウェルトゥムヌス」](https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Vertumnus_%C3%A5rstidernas_gud_m%C3%A5lad_av_Giuseppe_Arcimboldo_1591_-_Skoklosters_slott_-_91503.jpg/960px-Vertumnus_%C3%A5rstidernas_gud_m%C3%A5lad_av_Giuseppe_Arcimboldo_1591_-_Skoklosters_slott_-_91503.jpg)

画像: [Vertumnus, Giuseppe Arcimboldo, 1591](https://commons.wikimedia.org/wiki/File:Vertumnus_%C3%A5rstidernas_gud_m%C3%A5lad_av_Giuseppe_Arcimboldo_1591_-_Skoklosters_slott_-_91503.jpg)（ジュゼッペ・アルチンボルド、撮影 Erik Lernestål、パブリックドメイン）

物の形と顔の形の両方が成り立つ構図を考える。今は、画像生成モデルに物の種類と顔の形を条件として与える。Web では、顔が元の物に分解して散らばるアニメーションにする。

### カードスタント

![ローズボウルでのカードスタント](https://upload.wikimedia.org/wikipedia/commons/1/1c/CardStunt-010104-RoseBowl.jpg)

画像: [CardStunt-010104-RoseBowl.jpg](https://commons.wikimedia.org/wiki/File:CardStunt-010104-RoseBowl.jpg)（Bobak Ha'Eri、CC BY-SA 2.5）

::youtube[NHL Stadium Series Card Stunt]{id="vgliLqiAqz0"}

何万席分のカードの色と出す順番を設計し、全員で合わせる。今は、絵から席ごとの指示を自動で割り出す。Web では、閲覧者が 1 人 1 マスを受け持ち、全員がそろうと絵になる参加型のページにする。

### オーディオモザイク

::youtube[CataRT interactive corpus analysis based synthesis demo]{id="__z40HJDtKk"}

ある曲を別の大量の音源の断片だけで組み直す。断片を 1 つずつ聞いて選ぶ。今は、音響特徴量の近さで断片を自動で選ぶ（[連結合成](https://en.wikipedia.org/wiki/Concatenative_synthesis)）。Web では、再生中の断片の元の曲名が流れていくプレイヤーにする。

### ドミノアート

::youtube[11 YEARS OF DOMINO ART | Best of Hevesh5]{id="SEvtN5XpPWY"}

何万個のドミノを色の絵として並べ、倒れる順番まで設計する。途中で倒すと並べ直しになる。今は、絵からドミノの配置図を割り出し、倒れ方を物理シミュレーションで確かめる。Web では、閲覧者が最初の 1 個を押すと絵が現れるシミュレーションにする。

### マイクログラフィー

![ヘブライ語の細かな文字で描いたシヴィティ](https://upload.wikimedia.org/wikipedia/commons/a/aa/A_shiviti%2C_Denmark.jpg)

画像: [A shiviti, Denmark](https://commons.wikimedia.org/wiki/File:A_shiviti,_Denmark.jpg)（作者不明、デンマーク王立図書館の所蔵、パブリックドメイン）

::youtube[Micrography Portrait Art Tutorial]{id="tyFt7CtfUmE"}

極小の文字の濃さと密度だけで陰影を描く。今は、画像の明るさに合わせて文字の大きさと間隔を計算する。Web では、ズームすると線がすべて文章として読める SVG にする。

### 群衆画

::youtube[The Where's Waldo Legacy]{id="_Kpfe1k6CuM"}

何百人もの人物を、それぞれ違う動作で 1 枚に描き込む。今は、人物を画像生成で大量に作り、配置を最適化する。Web では、ズームできる絵の中で、指定した人物を探させる。

### 刺繍の肖像

::youtube[The making of Portrait Embroidery #3]{id="isFgQ3DO6YA"}

糸の色を少しずつ変えながら針目を重ね、写真のような陰影を出す。1 枚に数十時間かかる。今は、写真から糸の色と針目の向きを割り出し、刺繍ミシンのデータにできる。Web では、針目が 1 本ずつ縫われていくアニメーションを作る。

### 付箋のモザイク

::youtube[How Googlers turned an office into a sticky-note art gallery]{id="cxWsZF6mUis"}

窓一面に数千枚の付箋を、色の設計図どおりに貼る。今は、絵を付箋の色数に減色して貼る位置の図を出せる。Web では、閲覧者が 1 枚ずつ貼って絵を完成させる共同作業のページにする。

### ルービックキューブのモザイク

::youtube[Invader Rubikcubist]{id="Ig6zNRDw3as"}

数百個のキューブそれぞれの面を、絵の 9 マス分の色にそろえる。Invader の作品が有名。今は、絵を 6 色に減色し、各キューブの面の配置と揃え方の手順を計算できる。Web では、各キューブが回って絵がそろうアニメーションにする。

## 一本の線で描く

### ストリングアート

::youtube[A new way to knit]{id="zDjbvPmK_Mc"}

円周の釘から釘へ糸を渡す組を 3,000〜4,000 回選ぶ。[Petros Vrellis](https://www.booooooom.com/2016/08/23/new-way-knit-with-experimental-artist-petros-vrellis/) の作品で有名になった。今は、元の画像との差が最も減る釘を貪欲に選び続ける。Web では、糸が 1 本ずつ張られて絵が出てくるアニメーションにする。

### TSP アート

::youtube[Opt Art: From Mathematical Optimization to Visual Design]{id="g3CiVrN-BnY"}

交差しない閉じた 1 本の線で絵を描く。暗い所に点を多く置き、全部を一筆で回る道を探す（[Kaplan と Bosch の論文](https://archive.bridgesmathart.org/2005/bridges2005-301.html)）。今は、点の配置は点描と同じ方法で決め、道は巡回セールスマン問題のソルバーで解く。Web では、線を引いていく様子を見せ、ズームしても 1 本につながっていることを確かめさせる。

### 絵になる迷路

線で絵を描きつつ、解ける迷路として成り立たせる（[Pedersen と Singh の作例](https://www.dgp.toronto.edu/~karan/maze/)）。今は、引き合いと押し合いで曲線を成長させるアルゴリズムが生成する。Web では、拡大しながらマウスで実際に解ける迷路にする。

### 線彫りの版画

![デューラー「メランコリア I」](https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Albrecht_D%C3%BCrer_-_Melencolia_I_-_Google_Art_Project_%28_AGDdr3EHmNGyA%29.jpg/960px-Albrecht_D%C3%BCrer_-_Melencolia_I_-_Google_Art_Project_%28_AGDdr3EHmNGyA%29.jpg)

画像: [Albrecht Dürer - Melencolia I](<https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer_-_Melencolia_I_-_Google_Art_Project_(_AGDdr3EHmNGyA).jpg>)（アルブレヒト・デューラー、パブリックドメイン）

陰影を線の太さと間隔と向きだけで表し、銅版に 1 本ずつ彫る。紙幣の肖像もこの技法。今は、画像の明るさと形の向きからハッチングの線を生成し、プロッターやレーザーで刻む。Web では、写真を入れると線彫りに変わり、拡大すると線の流れが見える。

### フーリエ級数の円で描く

::youtube[But what is a Fourier series]{id="r6sGWTCMz2k"}

回転する円をつないで任意の線を描く。係数を手で計算する。今は、線をサンプリングして高速フーリエ変換にかける。Web では、円が回りながら線を描いていくアニメーションにする。

### GPS アート

![GPS の軌跡で描いたテディベア](https://upload.wikimedia.org/wikipedia/commons/3/35/Teddy_Bear_GPS_Drawing.jpg)

画像: [Teddy Bear GPS Drawing](https://commons.wikimedia.org/wiki/File:Teddy_Bear_GPS_Drawing.jpg)（Volker Weinlich、CC BY-SA 2.5）

::youtube[How to make Strava Art / GPS Art]{id="9l_eVE_uaJU"}

実際の道だけを通って、地図上に絵が残る経路を探して走る。今は、道路網のグラフから、絵の形に最も近い経路を探索する。Web では、地図の上に軌跡が描かれていくアニメーションにする。

### ケルトの結び目文様

::youtube[An Introduction to Celtic Design]{id="-DY1ssumuYs"}

線が交互に上下を通る組紐を、途切れずに編み込んで描く。今は、格子の上で交差の上下を自動で決めて描画できる。Web では、好きな形の中に結び目文様を敷き詰める。

## 見る角度や条件で変わる

### シャドーアート

::youtube[Shadow Art]{id="pXHjVIkcclo"}

1 つの立体の影が、向きごとに別の絵になるよう設計する（[Mitra と Pauly の論文](https://graphics.stanford.edu/~niloy/research/shadowArt/shadowArt_sigA_09.html)）。今は、各方向の影の制約を満たすボクセルを最適化で求める。Web では、three.js で回せる立体として置き、光源を動かして影を見せる。

### アナモルフォーシス

![ホルバイン「大使たち」。下の斜めの形は、斜めから見ると頭蓋骨になる](https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg/960px-Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg)

画像: [The Ambassadors, Hans Holbein the Younger](https://commons.wikimedia.org/wiki/File:Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg)（ハンス・ホルバイン、パブリックドメイン）

::youtube[Amazing Anamorphic Illusions]{id="tBNHPk-Lnkk"}

特定の視点からだけ正しく見えるよう、射影を手で計算して描く。今は、3D 空間で視点から逆に射影して描く。Web では、カメラをドラッグし、ばらばらの破片が 1 つの絵にそろう視点を探させる。

### アンビグラム・回すと別の絵になる隠し絵

![回転させても同じ語に読めるアンビグラム](https://upload.wikimedia.org/wikipedia/commons/4/44/Ambigram_of_the_word_ambigram_-_rotation_animation.gif)

画像: [Ambigram of the word ambigram - rotation animation.gif](https://commons.wikimedia.org/wiki/File:Ambigram_of_the_word_ambigram_-_rotation_animation.gif)（Basile Morin、CC BY-SA 4.0）

2 つの見え方の両方が成り立つ形を設計する。今は、拡散モデルで、回転・反転・ジグソーの並べ替えのどれにも対応する絵を作れる（[Visual Anagrams](https://openaccess.thecvf.com/content/CVPR2024/html/Geng_Visual_Anagrams_Generating_Multi-View_Optical_Illusions_with_Diffusion_Models_CVPR_2024_paper.html)）。Web では、ドラッグで回転させ、正解の向きを探させる。

### レンチキュラー

::youtube[How 3D and Animated Lenticular Prints Work]{id="fLz6gnuurPk"}

複数の絵を短冊に刻んで交互に並べ、レンズの間隔に合わせて印刷する。今は、短冊の割り付けはソフトで自動化されている。Web では、スマホの傾きセンサーで、傾けると絵が切り替わる。

### オートステレオグラム

![ランダムドットのオートステレオグラム。寄り目や平行法でサメが浮かぶ](https://upload.wikimedia.org/wikipedia/commons/8/8f/Stereogram_Tut_Random_Dot_Shark.png)

画像: [Stereogram Tut Random Dot Shark.png](https://commons.wikimedia.org/wiki/File:Stereogram_Tut_Random_Dot_Shark.png)（Fred Hsu、CC BY-SA 3.0）

模様の繰り返しの間隔を、奥行きに合わせて少しずつずらす。今は、深度マップから計算で作る。深度マップ自体もモデルで推定できる。Web では、繰り返しの模様に好きな画像を使い、深度を動かせるページにする。

### 小口絵

![本の小口を扇状にずらすと現れる絵](https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Arch_of_Traianus%2C_Ancona_-_Tasso_in_Prison%3B_-_the_Bridge_of_Sighs.jpg/960px-Arch_of_Traianus%2C_Ancona_-_Tasso_in_Prison%3B_-_the_Bridge_of_Sighs.jpg)

画像: [Arch of Traianus, Ancona - Tasso in Prison; - the Bridge of Sighs](https://commons.wikimedia.org/wiki/File:Arch_of_Traianus,_Ancona_-_Tasso_in_Prison;_-_the_Bridge_of_Sighs.jpg)（Boston Public Library、CC BY 2.0）

::youtube[A Hidden Art Form You'll Flip For]{id="E4_2xGZy6Jk"}

ページをずらした状態で 1 ページずつ端に描く。閉じると見えない。今は、各ページの端に印刷する帯を計算で割り出す。Web では、3D の本を扇状に開くと絵が現れる。

### ドロステ効果

絵の中に同じ絵を回転と縮小で入れ子にする。エッシャーの「版画画廊」は中心を描けず空白にした（[Lenstra と de Smit が数学で中心を埋めた](https://www.universiteitleiden.nl/en/research/research-projects/science/escher-and-the-droste-effect)）。今は、複素対数の変換を GPU のシェーダーでかける。画像生成の無限ズームとも組み合わせられる。Web では、[CindyJS の作例](https://cindyjs.org/gallery/main/Droste/)のように、スパイラルでどこまでも潜れる画面にする。

### エッシャー風の敷き詰め

::youtube[M.C. Escher - How To Create A Tessellation]{id="ZNVyrxdlrGQ"}

好きなシルエットを、隙間なく平面を埋める形に変形させる。今は、敷き詰めの型のパラメータを最適化で探す（[Escherization](https://history.siggraph.org/?p=118304)）。Web では、無限に続く壁紙をスクロールで眺める。

### オプアート

::youtube[Op Art Illusion Series: Radiating Ripples]{id="DT_1mq5VaU8"}

線や円を何千本も精密に反復して描く。今は、シェーダーで描く。Web では、スクロールに合わせて模様が揺れて錯視が強まるページにする。

### スキャニメーション

::youtube[MAGIC, ART AND SCANIMATION]{id="JLfLSjbm4s8"}

複数のコマを細い縞に刻んで 1 枚に織り込み、縞の板を滑らせると動いて見えるようにする。今は、コマの画像から織り込みの画像と縞の板を計算で作る。Web では、縞の板をドラッグして動かすページにする。

### コースティクス・レンズ

::youtube[Caustic lenses are really weird]{id="wk67eGXtbIw"}

光を通すと、ガラスの屈折で壁に絵が映るレンズ。表面の凹凸を手で設計するのは不可能に近い。今は、映したい画像から表面の形を最適化で求め、削り出せる。Web では、光の向きを変えると絵が崩れる様子をシミュレーションで見せる。

### プロジェクションマッピング

::youtube[3D Projection Mapping by MediaCraft.video - Church]{id="a6pYSwKeGEA"}

建物の形に合わせて映像を作り、プロジェクターの位置を細かく合わせる。今は、カメラで建物を測って映像の歪みを自動で補正できる。Web では、手元の写真に映像を重ねて試せるページにする。

## 時間を写す

### スリットスキャン

::youtube[What is Slit Scan Photography]{id="yihFkdyLSxw"}

機械仕掛けのスリットを動かしながら長時間露光する。「2001年宇宙の旅」のスターゲートの場面が有名。今は、動画の各フレームから 1 列ずつ取り出して並べる。Web では、カメラ映像をリアルタイムに引き伸ばすページを作る。

### 一日を一枚に収める写真

::youtube[The passing of time, caught in a single photo]{id="afev0ZjAhUA"}

Stephen Wilkes の「Day to Night」は、定点で 16〜30 時間に撮った約 1,500 枚を合成する。編集に数か月かかる。今は、位置合わせと合成の境界をソフトとモデルで自動化する。Web では、スライダーやスクロールで画面の中の時刻を動かす。

### ムービーバーコード

::youtube[The Big Lebowski | Movie Barcode]{id="OJW1kN4qeGk"}

動画の全フレームを 1 列ずつの色に縮めて並べる。今は[movie-barcodes](https://pypi.org/project/movie-barcodes) のようなツールで作れる。Web では、多数の動画の帯を年代順に並べ、色の変化を一望させる。

### バレットタイム

::youtube[THE MATRIX (1999) | Making of Bullet Time Scenes]{id="jYk0WHcmrYo"}

100 台を超えるカメラを並べて同時に撮る。今は、1 本の動画から Gaussian Splatting で 3D シーンを作り、視点を動かす。Web では、ブラウザで回せる 3D シーンにする。

### ハイパーラプス

::youtube[Hyperlapse vs Timelapse EXPLAINED]{id="zOqmajNYLxg"}

数歩ごとに三脚を据え直して撮り、1 枚ずつ位置を合わせる。今は、手持ち動画を手ぶれ補正して早送りする。Web では、スクロールで街を高速移動する。

### 連続写真

![マイブリッジ「動く馬」](https://upload.wikimedia.org/wikipedia/commons/3/39/The_Horse_in_motion._%22Abe_Edgington%2C%22_owned_by_Leland_Stanford%3B_driven_by_C._Marvin%2C_trotting_at_a_2-24_gait_over_the_Palo_Alto_track%2C_15th_June_1878_LOC_13624627695.jpg)

画像: [The Horse in motion, 1878](https://commons.wikimedia.org/wiki/File:The_Horse_in_motion._%22Abe_Edgington,%22_owned_by_Leland_Stanford;_driven_by_C._Marvin,_trotting_at_a_2-24_gait_over_the_Palo_Alto_track,_15th_June_1878_LOC_13624627695.jpg)（エドワード・マイブリッジ、アメリカ議会図書館、著作権の制限なし）

::youtube[The horse in motion (Eadweard Muybridge) 1878]{id="heRuLp7CyTM"}

何台ものカメラを並べ、被写体が通るとシャッターが順に切れる仕掛けを作る。今は、高速度撮影の動画からコマを抜き出して並べる。Web では、コマの並びと、それをつないだ動きをスクロールで行き来する。

### ライトペインティング

::youtube[How to do Light Painting with a PixelStick]{id="xtt7TIZ_-2Q"}

長時間露光の間に、光源を動かして空中に絵を描く。思いどおりの形にするには何度も撮り直す。今は、LED の棒が画像を 1 列ずつ光らせ、歩くだけで絵が写る。Web では、写真に光の軌跡を描き込めるページにする。

### フォトコラージュ（ジョイナー）

::youtube[David Hockney's Joiners]{id="-pNsfZYQeE0"}

ホックニーのように、少しずつ視点の違う写真を何十枚も貼り合わせて 1 つの場面にする。今は、特徴点を使えば写真の重なりを自動で合わせ、配置を決められる。Web では、貼られた写真が 1 枚ずつ置かれていく表示にする。

### ギガピクセル写真

::youtube[Making the Gigapixel Artzoom]{id="RwUWRRGEj_8"}

望遠で何千枚も撮り、継ぎ目なく貼り合わせて巨大な 1 枚にする。今は、ロボット雲台で撮影し、合成もソフトが自動で行う。Web では、街全体から人の顔まで寄れるズームビューアにする。

## 1 コマずつ作る動き

### ピンスクリーン・アニメーション

::youtube[Animation on the Alexeïeff-Parker pinscreen]{id="0A5pWqZhJSk"}

数十万本のピンの出し入れが作る影で絵を描き、1 コマずつ押し直す。今は、画像からピンの高さを計算し、影を物理シミュレーションで描く。Web では、マウスでピン面をなでると絵が浮かぶ。

### ロトスコープ

![ロトスコープの特許の図](https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/US_patent_1242674_figure_3.png/960px-US_patent_1242674_figure_3.png)

画像: [US patent 1242674 figure 3](https://commons.wikimedia.org/wiki/File:US_patent_1242674_figure_3.png)（マックス・フライシャーの特許、パブリックドメイン）

::youtube[The trick that made animation realistic]{id="IS1hCSsmH1E"}

実写を 1 コマずつなぞる。今は、輪郭抽出とスタイル変換をフレームごとにかける。Web では、実写となぞった絵をスライダーで見比べる。

### 3D ゾートロープ

::youtube[Pixar Toy Story 3D Zoetrope]{id="biG20MFGBNA"}

少しずつ形の違う立体をコマ数だけ作り、円盤に並べてストロボで照らす。今は、3D モデルから全コマを書き出して 3D プリントする。Web では、回転の速さを操作させ、止まって見える速さを探させる。

### ピクシレーション

::youtube[Her Morning Elegance / Oren Lavie]{id="2_HXUhShhmY"}

人や実物を 1 コマずつ動かして撮る。数分の映像に数千枚の撮影が要る。今は、コマ間の補間をモデルに任せて撮影枚数を減らす。Web では、動画として出し、スクロールでコマ送りさせる。

### パラパラ漫画

::youtube[Pencil Flipbook: Constalation Prize]{id="hio2CGVLihY"}

1 枚ずつ手で描く。今は、線画の中割りをモデルで生成する。Web では、スクロールでページをめくる。

### ピタゴラ装置

::youtube[OK Go - This Too Shall Pass - Rube Goldberg Machine]{id="qybUFnY7Y8w"}

連鎖が最後まで通るように、組み直しと撮り直しを繰り返す。今は、物理シミュレーションで連鎖を事前に確かめる。Web では、シミュレーションのまま、閲覧者が部品を足せる仕掛けにする。

### ASCII アートの動画

::youtube[FPS using ASCII chars test]{id="fW-pDkDvcfE"}

文字の濃さだけで陰影を作る。動画なら全フレーム分。今は、映像の明るさを文字に置き換える処理をリアルタイムにかける。Web では、DOM のテキストとして動画を再生する。

### キネティック・タイポグラフィ

::youtube[Toy Story - "You Are A Toy" Kinetic Typography]{id="_PU49-_qQoI"}

台詞や歌詞の 1 語ごとに、音に合わせた動きをキーフレームで付ける。今は、音声認識で語のタイミングを取り、動きのテンプレートを割り当てる。Web では、音声に合わせて DOM の文字が動くページにする。

### サンドアニメーション

::youtube[Kseniya Simonova Incredible Sand Art]{id="9zLa-o7ZeiQ"}

光る台の上の砂を手で動かし、絵を描いては崩して次の場面に変える。やり直しが利かない。今は、砂の動きを物理シミュレーションで描ける。Web では、マウスで砂を描いたり払ったりできるページにする。

### クレイアニメ

::youtube[How Stop-Motion Movies Are Animated at Aardman]{id="jZvQzkFcKEM"}

粘土の人形を少しずつ動かして 1 コマずつ撮る。1 日に数秒しか進まない。今は、撮ったコマの間をモデルで補間でき、口の形の差し替えも自動で選べる。Web では、粘土を変形させてコマを作れる道具にする。

### ドローンショー

::youtube[How Drone Shows Work]{id="7fKfBb7x9WQ"}

何百機のドローンを夜空に並べ、ぶつからずに絵から絵へ動かす。今は、機体の割り当てと経路を最適化で計算する。Web では、好きな絵を入れると点の群れが形を変える 3D シミュレーションにする。

## 紙と立体

### ポップアップ絵本

::youtube[The Definitive Pop-Up Book "Encyclopedia Prehistorica Dinosaurs"]{id="TaEi3VWniKE"}

開くと立ち上がる構造の、折り線と切れ目を試作の繰り返しで設計する。今は、3D モデルから展開図を逆算する。Web では、開く角度に合わせて紙が立ち上がるシミュレーションにする。

### 複雑な折り紙

::youtube[Ryujin 3.5 origami time lapse]{id="OXqJ9PFsBpI"}

神谷哲史の「龍神」のような 1 枚折りの作品は、展開図の設計と折る作業の両方に膨大な時間がかかる。今は、形から展開図を計算するソフトがある。Web では、[Origami Simulator](https://origamisimulator.org/) のように、展開図が折り上がる過程を 3D で見せる。

### シャドーボックス

::youtube[DIY 3D PaperCut Shadow Box]{id="qH17lUGZxWA"}

何層もの切り絵を重ね、後ろから照らして奥行きのある絵にする。層ごとに切り分ける形を考えるのが大変。今は、画像の奥行きを推定して層に分け、カッティングマシンで切れる。Web では、層が離れて見える 3D の表示にする。

### 等高線の立体地図

::youtube[How to make a 3d map]{id="AZ7lWrqidgk"}

等高線ごとに紙や板を切り、積み重ねて地形にする。今は、標高データから各層の形を出してレーザーで切れる。Web では、好きな場所の地形を層に分けて見せる。

### 一枚切りの切り絵

::youtube[Paper Cut Portrait Process]{id="dCzf1w1RFw0"}

1 枚の紙から、すべての部分がつながったまま絵を切り出す。どこを残せば全体がばらけないかを考えるのが難しい。今は、画像からつながりを保った切り抜きの線を計算できる。Web では、写真から切り絵の型紙を作るページにする。

## 音

### スペクトログラムに絵を描く

::youtube[Aphex Twin Spectrogram]{id="M9xMuPWAZW8"}

音の周波数成分を手で合成して、スペクトログラムに絵が出るようにする。Aphex Twin の曲の中の顔が有名。今は、画像を逆短時間フーリエ変換で音にする。Web では、音を再生しながらスペクトログラムを描き、絵が現れるのを見せる。

### バーチャル合唱

::youtube[Eric Whitacre's Virtual Choir - Lux Aurumque]{id="D7o7BrlbaDs"}

世界中の数百人が別々に録った歌の映像を、1 つの合唱に合わせて編集する。今は、音声の時間合わせと音程の補正を自動化できる。Web では、声部ごとの音量を変えながら聴けるプレイヤーにする。

### 動画の断片で作る曲

::youtube[Kutiman - Thru You Too - GIVE IT UP]{id="WoHxoz_0ykI"}

Kutiman は、他人が YouTube に上げた演奏の断片だけを集めて 1 曲を作った。素材探しと編集に膨大な時間がかかる。今は、音源分離と音響特徴量の検索で素材を探せる。Web では、断片ごとに元の動画へ飛べるプレイヤーにする。

### 話すピアノ

::youtube[Speaking Piano]{id="muCPjK4nGY4"}

人の声の周波数成分を、ピアノの鍵盤の組み合わせで再現する。Peter Ablinger の作品が有名。今は、声を短く区切って周波数分析し、鍵盤の打ち方に変換できる。Web では、録音した声をその場でピアノが弾き直すページを作る。

## 言葉

### 完全パングラム

![いろはを使ったかるた](https://upload.wikimedia.org/wikipedia/commons/3/35/New_Edition_of_Iroha_Brigade_Characters_%28Shinpan_iroha_kumiji%29.jpg)

画像: [New Edition of Iroha Brigade Characters](<https://commons.wikimedia.org/wiki/File:New_Edition_of_Iroha_Brigade_Characters_(Shinpan_iroha_kumiji).jpg>)（Smithsonian Institution、CC0）

いろは歌のように、全部のかなをちょうど 1 回ずつ使って意味の通る文を作る。今は、探索と言語モデルで候補を大量に作る。Web では、かなが並べ替わって次々に詩になるページを作る。

### 長い回文

前から読んでも後ろから読んでも同じで、意味も通る長文を作る。今は、辞書の探索と言語モデルの評価を組み合わせる。Web では、中心から左右に同時に文字が伸びていく表示にする。

### 折句・アクロスティック

![各行の頭の文字をつなぐと名前になる 1850 年の詩](https://upload.wikimedia.org/wikipedia/commons/1/10/1850_acrostic_Dearborn.png)

画像: [1850 acrostic Dearborn](https://commons.wikimedia.org/wiki/File:1850_acrostic_Dearborn.png)（Nathaniel Dearborn、パブリックドメイン）

各行の頭の文字で別の語を作りつつ、本文として意味を通す。今は、頭の文字を制約にして言語モデルで生成する。Web では、行頭の文字が浮かび上がって隠れた語が現れる表示にする。

### リポグラム

特定の文字を一切使わずに長文を書く。ジョルジュ・ペレックは e を使わない長編小説『[煙滅](https://en.wikipedia.org/wiki/A_Void)』を書いた。今は、言語モデルの生成で、禁止する文字を含むトークンを選ばせない。Web では、禁止する文字を閲覧者が選ぶと、文章がその場で書き換わる。

### クロスワードの作成

::youtube[How to Create a Crossword Puzzle]{id="aAqQnXHd7qk"}

縦と横のすべての語が辞書にあるよう、盤面を埋める語を選ぶ。テーマに沿わせるとさらに難しい。今は、制約充足の探索で盤面を埋め、言語モデルでヒントの文を作れる。Web では、閲覧者がテーマを入れるとその場で盤面ができるページにする。
