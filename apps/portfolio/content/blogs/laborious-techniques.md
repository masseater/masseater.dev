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

元の絵を格子に分け、各マスに平均色の近い写真を 1 枚ずつ置いて絵を再現する。同じ写真を 1 回しか使わない条件では、マスと写真の組み合わせ全体を見て決める必要があり、数千マスを手で割り当てるのは現実的でない。計算機では、マスと写真の色の差を費用とする割り当て問題として、ハンガリアン法などで費用の合計が最小になる組を求める。Web では、ズームできるビューアに載せ、引くと絵、寄ると写真の 1 枚 1 枚が見えるようにする。

### 動くフォトモザイク

::youtube[Animated photo mosaic: Barbarella]{id="m4zhylt2nMk"}

動画の各フレームをフォトモザイクにし、マスの中身にも写真ではなく短い動画を使う。フレームごとに割り当てを独立して解くと、隣り合うフレームのあいだでマスの素材が入れ替わり続け、画面がちらつく。計算機では、前のフレームと同じ素材を使い続けると費用が下がるように割り当て問題を組み、フレーム間の入れ替わりを抑える。Web では動画として再生し、一時停止したときにマスを押すと元の素材が開くようにする。

### 点描

![スーラ「グランド・ジャット島の日曜日の午後」](https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg/960px-A_Sunday_on_La_Grande_Jatte%2C_Georges_Seurat%2C_1884.jpg)

画像: [A Sunday on La Grande Jatte, Georges Seurat, 1884](https://commons.wikimedia.org/wiki/File:A_Sunday_on_La_Grande_Jatte,_Georges_Seurat,_1884.jpg)（ジョルジュ・スーラ、パブリックドメイン）

::youtube[Time-Lapse Stippling of James Dean]{id="dTxPAIh7RV0"}

点の大きさをそろえたまま、暗い所ほど点を密に打って濃淡を表す。数万の点を、むらや規則的な模様が出ないよう均等に散らしつつ、密度だけを変えるのが難しい。計算機では、画像の暗さを重みにした重み付きボロノイ図を作り、各点を自分の領域の重心へ動かす処理を繰り返す（weighted Voronoi stippling）。Web では、ばらばらの点が重心へ動いて絵になる過程をアニメーションで見せる。

### カリグラム

![アポリネールのカリグラム](https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Calligramme.svg/960px-Calligramme.svg.png)

画像: [Calligramme.svg](https://commons.wikimedia.org/wiki/File:Calligramme.svg)（ギヨーム・アポリネール、パブリックドメイン）

文字の並びそのもので絵の形を作る。行の長さや文字の大きさは形の輪郭で決まり、そのうえで文章として順番どおりに読める配置が要る。計算機では、形の内側を通る行の経路を決め、経路の長さに合わせて文字の大きさと間隔を自動で調整する。Web では SVG で描き、引くと絵、寄ると全文が読めるようにする。

### アルチンボルドの寄せ絵

![アルチンボルド「ウェルトゥムヌス」](https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Vertumnus_%C3%A5rstidernas_gud_m%C3%A5lad_av_Giuseppe_Arcimboldo_1591_-_Skoklosters_slott_-_91503.jpg/960px-Vertumnus_%C3%A5rstidernas_gud_m%C3%A5lad_av_Giuseppe_Arcimboldo_1591_-_Skoklosters_slott_-_91503.jpg)

画像: [Vertumnus, Giuseppe Arcimboldo, 1591](https://commons.wikimedia.org/wiki/File:Vertumnus_%C3%A5rstidernas_gud_m%C3%A5lad_av_Giuseppe_Arcimboldo_1591_-_Skoklosters_slott_-_91503.jpg)（ジュゼッペ・アルチンボルド、撮影 Erik Lernestål、パブリックドメイン）

果物や野菜などを寄せ集め、全体として人の顔に見える絵を描く。個々の物が物として自然に見える形と、顔の目鼻として働く配置を同時に満たす構図を考えるのが難しい。計算機では、顔の輪郭や奥行きを条件として画像生成モデルに与え、指定した種類の物だけで画面を埋めさせる。Web では、顔の絵が個々の物に分解して散らばるアニメーションにする。

### カードスタント

![ローズボウルでのカードスタント](https://upload.wikimedia.org/wikipedia/commons/1/1c/CardStunt-010104-RoseBowl.jpg)

画像: [CardStunt-010104-RoseBowl.jpg](https://commons.wikimedia.org/wiki/File:CardStunt-010104-RoseBowl.jpg)（Bobak Ha'Eri、CC BY-SA 2.5）

::youtube[NHL Stadium Series Card Stunt]{id="vgliLqiAqz0"}

スタジアムの観客が色のついたカードを一斉に掲げ、客席全体を 1 枚の絵にする。座席の数だけ色を設計して各席に指示書を配り、全員が同じ瞬間に正しい色を出す必要がある。計算機では、絵を客席の配置に合わせて縮小と減色をかけ、席番号ごとの指示を自動で出力できる。Web では、閲覧者 1 人に 1 マスを割り当て、全員が色を出すと絵が完成する参加型のページにする。

### オーディオモザイク

::youtube[CataRT interactive corpus analysis based synthesis demo]{id="__z40HJDtKk"}

ある曲を、別の大量の音源から切り出した短い断片だけで組み直す。目標の曲の各瞬間に音色や音程が近い断片を、何万もの候補から聴いて選ぶのは手作業では無理がある。計算機では、目標と候補の両方から MFCC などの音響特徴量を計算し、特徴量が近い断片を順に並べる（[連結合成](https://en.wikipedia.org/wiki/Concatenative_synthesis)）。Web では、再生中の断片がどの音源から来たかを表示するプレイヤーにする。

### ドミノアート

::youtube[11 YEARS OF DOMINO ART | Best of Hevesh5]{id="SEvtN5XpPWY"}

色のついたドミノを床に並べて絵を作り、倒れていく連鎖で絵を見せる。数万個を 1 つずつ置き、途中で誤って倒すと並べ直しになる。倒れる順番も演出になるため、連鎖の経路まで設計する必要がある。計算機では、絵をドミノの配置図に変換し、倒れる順番と所要時間を物理シミュレーションで確かめられる。Web では、閲覧者が最初の 1 個を押すと連鎖が進んで絵が現れるシミュレーションにする。

### マイクログラフィー

![ヘブライ語の細かな文字で描いたシヴィティ](https://upload.wikimedia.org/wikipedia/commons/a/aa/A_shiviti%2C_Denmark.jpg)

画像: [A shiviti, Denmark](https://commons.wikimedia.org/wiki/File:A_shiviti,_Denmark.jpg)（作者不明、デンマーク王立図書館の所蔵、パブリックドメイン）

::youtube[Micrography Portrait Art Tutorial]{id="tyFt7CtfUmE"}

線の代わりに極小の文字を並べて絵を描く。文字の大きさや詰め具合だけで陰影を出しつつ、文章として読める順番を保つ必要がある。計算機では、画像の明るさから文字の大きさと行間を決め、輪郭に沿った経路へ文章を流し込む。Web では SVG で描き、拡大すると線がすべて文章だと分かるようにする。

### 群衆画

::youtube[The Where's Waldo Legacy]{id="_Kpfe1k6CuM"}

人を探す絵本のように、何百人もの人物をそれぞれ違う動作で 1 枚に描き込む。人物ごとに姿勢と服装を考え、重なりや視線の流れまで調整する作業が膨大になる。計算機では、人物を画像生成で大量に作り、重ならないように配置を最適化できる。Web では、ズームできる絵の中で指定した人物を探させる。

### 刺繍の肖像

::youtube[The making of Portrait Embroidery #3]{id="isFgQ3DO6YA"}

糸の色を少しずつ変えた針目を重ね、写真のような陰影を出す（スレッドペインティング）。針目の向きと色の切り替えをすべて手で決めるので、1 枚に数十時間かかる。計算機では、写真から領域ごとの色と針目の向きを割り出し、刺繍ミシンの縫いデータに変換できる。Web では、針目が 1 本ずつ縫われていくアニメーションにする。

### 付箋のモザイク

::youtube[How Googlers turned an office into a sticky-note art gallery]{id="cxWsZF6mUis"}

窓やオフィスの壁に色の違う付箋を貼り、1 枚を 1 画素として大きな絵を作る。数千枚を設計図どおりに貼る必要があり、手持ちの付箋の色数に合わせた設計図を作るのも手間がかかる。計算機では、絵を付箋の色に減色して格子に落とし、貼る位置の図を出力できる。Web では、閲覧者が 1 枚ずつ貼って絵を完成させる共同作業のページにする。

### ルービックキューブのモザイク

::youtube[Invader Rubikcubist]{id="Ig6zNRDw3as"}

数百個のルービックキューブを並べ、各キューブの正面の 9 マスを絵の 9 画素として使う。Invader の作品が有名である。キューブごとに正面の色の並びを決め、その状態まで 1 個ずつ回してそろえる必要がある。計算機では、絵をキューブの 6 色に減色して各キューブの正面の配色を決め、その配色にする回転手順もソルバーで求められる。Web では、各キューブが回って絵がそろうアニメーションにする。

## 一本の線で描く

### ストリングアート

::youtube[A new way to knit]{id="zDjbvPmK_Mc"}

円周に並べた釘のあいだに 1 本の糸を何千回も渡し、線の重なりの濃淡で肖像を描く。[Petros Vrellis](https://www.booooooom.com/2016/08/23/new-way-knit-with-experimental-artist-petros-vrellis/) の作品が有名である。次にどの釘へ渡すかを 3,000〜4,000 回選び続ける必要があり、手で考えて決められる量ではない。計算機では、今の糸の状態と元の画像との差を計算し、その差が最も減る釘を次の行き先に選ぶ貪欲法で順番を決める。Web では、糸が 1 本ずつ張られて絵が出てくるアニメーションにする。

### TSP アート

::youtube[Opt Art: From Mathematical Optimization to Visual Design]{id="g3CiVrN-BnY"}

交差しない閉じた 1 本の線だけで絵を描く。暗い所ほど多くの点を置き、そのすべてを一筆で回る道を作ると、線の密度で濃淡が出る（[Kaplan と Bosch の論文](https://archive.bridgesmathart.org/2005/bridges2005-301.html)）。数万の点を交差させずに一周する道は、手では探せない。計算機では、点の配置を点描と同じ方法で決め、道を巡回セールスマン問題のソルバーで求める。Web では、線が引かれていく過程を見せ、拡大しても 1 本につながっていることを確かめられるようにする。

### 絵になる迷路

迷路の通路の線そのもので絵を描き、しかも入口から出口まで解ける迷路にする（[Pedersen と Singh の作例](https://www.dgp.toronto.edu/~karan/maze/)）。絵として見える線の配置と、迷路として成り立つ通路のつながりを両立させる設計が難しい。計算機では、曲線どうしが引き合いと押し合いをしながら伸びるシミュレーションで、画像の濃淡に沿った密度の迷路を生成する。Web では、拡大しながらマウスで実際に解ける迷路にする。

### 線彫りの版画

![デューラー「メランコリア I」](https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Albrecht_D%C3%BCrer_-_Melencolia_I_-_Google_Art_Project_%28_AGDdr3EHmNGyA%29.jpg/960px-Albrecht_D%C3%BCrer_-_Melencolia_I_-_Google_Art_Project_%28_AGDdr3EHmNGyA%29.jpg)

画像: [Albrecht Dürer - Melencolia I](<https://commons.wikimedia.org/wiki/File:Albrecht_D%C3%BCrer_-_Melencolia_I_-_Google_Art_Project_(_AGDdr3EHmNGyA).jpg>)（アルブレヒト・デューラー、パブリックドメイン）

陰影を線の太さと間隔と向きだけで表し、銅版に 1 本ずつ彫る。紙幣の肖像もこの技法で作られている。形の丸みに沿って線を曲げ、明るさに応じて太さを変えながら彫るには熟練が要る。計算機では、画像の明るさと輪郭の向きから線の流れを決めて太さの変わるハッチングを生成し、プロッターやレーザーで刻める。Web では、写真を入れると線彫りに変わり、拡大すると線の流れが見えるページにする。

### フーリエ級数の円で描く

::youtube[But what is a Fourier series]{id="r6sGWTCMz2k"}

一定の速さで回る円を何十個もつなげ、先端の軌跡で任意の閉じた線を描く。各円の半径と最初の角度は線のフーリエ係数から決まり、手で積分して求めるのは大変である。計算機では、線を等間隔の点に分けて高速フーリエ変換にかければ、係数がすぐに得られる。Web では、円が回りながら線を描いていくアニメーションにする。

### GPS アート

![GPS の軌跡で描いたテディベア](https://upload.wikimedia.org/wikipedia/commons/3/35/Teddy_Bear_GPS_Drawing.jpg)

画像: [Teddy Bear GPS Drawing](https://commons.wikimedia.org/wiki/File:Teddy_Bear_GPS_Drawing.jpg)（Volker Weinlich、CC BY-SA 2.5）

::youtube[How to make Strava Art / GPS Art]{id="9l_eVE_uaJU"}

GPS で記録しながら走ったり歩いたりして、地図上の軌跡で絵を描く。実在の道だけを通って絵の形に見える経路を、地図を見ながら探す必要がある。計算機では、道路網をグラフとして扱い、絵の輪郭との距離が最小になる経路を探索できる。Web では、地図の上に軌跡が描かれていくアニメーションにする。

### ケルトの結び目文様

::youtube[An Introduction to Celtic Design]{id="-DY1ssumuYs"}

帯が交差するたびに上と下を交互に通る組紐文様を、途切れずに描く。交差の上下を全体で矛盾なく決め、帯の曲がり方をそろえて描くのに手間がかかる。計算機では、格子の上に交差点を置いて上下を交互に割り当て、帯の曲線を自動で描ける。Web では、好きな形の中に結び目文様を敷き詰めるページにする。

## 見る角度や条件で変わる

### シャドーアート

::youtube[Shadow Art]{id="pXHjVIkcclo"}

1 つの立体に光を当てたとき、光の向きごとにまったく別の絵が影として映るようにする（[Mitra と Pauly の論文](https://graphics.stanford.edu/~niloy/research/shadowArt/shadowArt_sigA_09.html)）。3 方向の影の条件を同時に満たす立体は、頭の中では設計できない。計算機では、空間をボクセルに分け、各方向の影が目標の絵と一致するボクセルの集合を最適化で求める。Web では、three.js で回せる立体として置き、光源を動かして影の変化を見せる。

### アナモルフォーシス

![ホルバイン「大使たち」。下の斜めの形は、斜めから見ると頭蓋骨になる](https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg/960px-Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg)

画像: [The Ambassadors, Hans Holbein the Younger](https://commons.wikimedia.org/wiki/File:Hans_Holbein_the_Younger_-_The_Ambassadors_-_Google_Art_Project.jpg)（ハンス・ホルバイン、パブリックドメイン）

::youtube[Amazing Anamorphic Illusions]{id="tBNHPk-Lnkk"}

特定の位置から見たときだけ正しい形に見えるように、引き伸ばした絵を描く。ホルバインの「大使たち」の下にある斜めの形は、斜めから見ると頭蓋骨になる。正面から見た形を斜めの面へ射影する計算を、描きながら手で行うのが難しい。計算機では、視点から絵を描く面へ逆に射影すれば、引き伸ばした形が求まる。Web では、カメラをドラッグさせ、ばらばらの破片が 1 つの絵にそろう視点を探させる。

### アンビグラム・回すと別の絵になる隠し絵

![回転させても同じ語に読めるアンビグラム](https://upload.wikimedia.org/wikipedia/commons/4/44/Ambigram_of_the_word_ambigram_-_rotation_animation.gif)

画像: [Ambigram of the word ambigram - rotation animation.gif](https://commons.wikimedia.org/wiki/File:Ambigram_of_the_word_ambigram_-_rotation_animation.gif)（Basile Morin、CC BY-SA 4.0）

回転や反転をしても同じ語、または別の語や絵として読めるように形を作る。2 通りの見え方の両方で成り立つ形を設計するのが難しい。計算機では、拡散モデルが画像を生成する各段階で、元の向きと回転した向きの両方についてノイズを推定し、平均してから画像を更新する。こうすると、どちらの向きから見ても成り立つ画像ができる（[Visual Anagrams](https://openaccess.thecvf.com/content/CVPR2024/html/Geng_Visual_Anagrams_Generating_Multi-View_Optical_Illusions_with_Diffusion_Models_CVPR_2024_paper.html)）。Web では、ドラッグで回転させ、別の絵に変わる向きを探させる。

### レンチキュラー

::youtube[How 3D and Animated Lenticular Prints Work]{id="fLz6gnuurPk"}

見る角度によって絵が切り替わったり立体に見えたりする印刷である。複数の絵を細い短冊に切って交互に並べ、かまぼこ形のレンズを並べた板と重ねる。短冊の幅をレンズの間隔に正確に合わせないと絵が混ざる。計算機では、短冊の割り付けを自動で計算し、印刷とレンズのずれも補正できる。Web では、スマホの傾きセンサーを使い、傾けると絵が切り替わるページにする。

### オートステレオグラム

![ランダムドットのオートステレオグラム。寄り目や平行法でサメが浮かぶ](https://upload.wikimedia.org/wikipedia/commons/8/8f/Stereogram_Tut_Random_Dot_Shark.png)

画像: [Stereogram Tut Random Dot Shark.png](https://commons.wikimedia.org/wiki/File:Stereogram_Tut_Random_Dot_Shark.png)（Fred Hsu、CC BY-SA 3.0）

1 枚の模様の画像を寄り目や平行法で見ると、立体の形が浮かび上がる。左右の目が見る模様の繰り返し間隔を、表したい奥行きに合わせて少しずつずらす必要がある。計算機では、深度マップから各点の繰り返し間隔を計算して模様を並べる。深度マップ自体も、写真からモデルで推定できる。Web では、繰り返しの模様と深度を選んでその場で画像を作るページにする。

### 小口絵

![本の小口を扇状にずらすと現れる絵](https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Arch_of_Traianus%2C_Ancona_-_Tasso_in_Prison%3B_-_the_Bridge_of_Sighs.jpg/960px-Arch_of_Traianus%2C_Ancona_-_Tasso_in_Prison%3B_-_the_Bridge_of_Sighs.jpg)

画像: [Arch of Traianus, Ancona - Tasso in Prison; - the Bridge of Sighs](https://commons.wikimedia.org/wiki/File:Arch_of_Traianus,_Ancona_-_Tasso_in_Prison;_-_the_Bridge_of_Sighs.jpg)（Boston Public Library、CC BY 2.0）

::youtube[A Hidden Art Form You'll Flip For]{id="E4_2xGZy6Jk"}

本の小口（ページの端）に描かれ、ページを扇状にずらしたときだけ現れる絵である。本を閉じると見えない。ずらした状態で本を固定し、ページの端にまたがって描く必要がある。計算機では、扇状にずらしたときの各ページの端の位置を計算し、各ページの端に印刷する細い帯を割り出せる。Web では、3D の本を扇状に開くと絵が現れる表示にする。

### ドロステ効果

絵の中に同じ絵が回転しながら縮小して入れ子になる。エッシャーの「版画画廊」は中心を描けず、空白のまま残された。のちに Lenstra と de Smit が、この絵は複素平面上の対数による変換として説明できることを示し、中心を埋めた（[Escher and the Droste effect](https://www.universiteitleiden.nl/en/research/research-projects/science/escher-and-the-droste-effect)）。計算機では、複素対数による変換を画像にかけるシェーダーで、どこまでも潜れる入れ子を作れる。Web では、[CindyJS の作例](https://cindyjs.org/gallery/main/Droste/)のように、スパイラルで潜り続けられる画面にする。

### エッシャー風の敷き詰め

::youtube[M.C. Escher - How To Create A Tessellation]{id="ZNVyrxdlrGQ"}

魚や鳥などのシルエットを変形させ、同じ形だけで平面を隙間なく埋める。元の形らしさを保ったまま、隣り合う辺が噛み合う形を見つけるには試行錯誤が要る。計算機では、平面を埋められるタイルの型をパラメータで表し、元のシルエットに最も近いタイルを最適化で探す（[Escherization](https://history.siggraph.org/?p=118304)）。Web では、無限に続く壁紙としてスクロールで眺められるようにする。

### オプアート

::youtube[Op Art Illusion Series: Radiating Ripples]{id="DT_1mq5VaU8"}

線や円の精密な反復だけで、静止画が揺れたり膨らんだりして見える錯視を起こす。わずかな間隔の乱れで効果が消えるため、何千本もの線を正確に引く必要がある。計算機では、シェーダーを使えば線の位置を数式どおりに描ける。Web では、スクロールに合わせて模様のパラメータを変え、錯視の強さが変わるページにする。

### スキャニメーション

::youtube[MAGIC, ART AND SCANIMATION]{id="JLfLSjbm4s8"}

数コマの絵を細い縦縞に分けて 1 枚に織り込み、その上で縞模様の透明な板を滑らせると、絵が動いて見える。縞の幅と板の隙間を正確に合わせて、コマを交互に並べた画像を作る必要がある。計算機では、各コマから縞を取り出して交互に並べた画像と、対応する板の模様を自動で作れる。Web では、縞の板をドラッグで動かすページにする。

### コースティクス・レンズ

::youtube[Caustic lenses are really weird]{id="wk67eGXtbIw"}

光を通したとき、屈折した光の集まり方で壁に絵が映るように表面を削ったレンズである。表面のどこをどれだけ曲げれば光がどこへ集まるかを、手で設計するのは不可能に近い。計算機では、映したい画像の明るさの分布へ光を運ぶ表面の形を最適輸送の計算で求め、CNC で削り出せる。Web では、光の向きを変えると絵が崩れる様子をシミュレーションで見せる。

### プロジェクションマッピング

::youtube[3D Projection Mapping by MediaCraft.video - Church]{id="a6pYSwKeGEA"}

建物などの立体に映像を投影し、形に合わせた映像で表面が動いたり崩れたりして見せる。建物の形を測って映像を作り、プロジェクターの位置と歪みを細かく合わせる必要がある。計算機では、投影結果をカメラで撮り、映像と建物の対応を自動で求めて歪みを補正できる。Web では、手元の写真の上に映像を重ねて試せるページにする。

## 時間を写す

### スリットスキャン

::youtube[What is Slit Scan Photography]{id="yihFkdyLSxw"}

細いスリットを通して少しずつ時刻をずらしながら撮り、時間の流れを画面の空間方向に写す。「2001年宇宙の旅」のスターゲートの場面は、スリットを機械で動かしながら 1 コマに数分の露光をかけて撮影された。計算機では、動画の各フレームから同じ位置の 1 列を取り出して横に並べるだけで作れる。Web では、カメラ映像をリアルタイムにスリットスキャンするページを作る。

### 一日を一枚に収める写真

::youtube[The passing of time, caught in a single photo]{id="afev0ZjAhUA"}

Stephen Wilkes の「Day to Night」は、定点で 16〜30 時間かけて約 1,500 枚を撮り、左から右へ時刻が移るように 1 枚に合成する。時刻の違う写真から場面ごとに良い瞬間を選び、継ぎ目が見えないように合成する編集に数か月かかる。計算機では、写真の位置合わせと、継ぎ目の境界をなじませる合成を自動化できる。Web では、スライダーやスクロールで画面の中の時刻を動かせるようにする。

### ムービーバーコード

::youtube[The Big Lebowski | Movie Barcode]{id="OJW1kN4qeGk"}

動画の各フレームを 1 列の平均色に縮め、時間順に横に並べて 1 本の帯にする。映画全体の色の移り変わりが一目で分かる。手で作るなら、全フレームの色を拾う必要がある。計算機では、[movie-barcodes](https://pypi.org/project/movie-barcodes) のようなツールに動画を読ませるだけで作れる。Web では、多数の動画の帯を年代順に並べ、色の傾向の変化を比べられるようにする。

### バレットタイム

::youtube[THE MATRIX (1999) | Making of Bullet Time Scenes]{id="jYk0WHcmrYo"}

時間が止まった被写体の周りをカメラが回り込むように見せる映像である。「マトリックス」では、100 台を超えるスチルカメラを被写体の周りに並べ、ほぼ同時にシャッターを切って撮った。計算機では、1 本の動画から Gaussian Splatting で 3D シーンを再構成し、任意の視点から描画できる。Web では、ブラウザで視点を回せる 3D シーンにする。

### ハイパーラプス

::youtube[Hyperlapse vs Timelapse EXPLAINED]{id="zOqmajNYLxg"}

撮影位置を移動させながら撮るタイムラプスである。数歩ごとに三脚を据え直して 1 枚ずつ撮り、後から全コマの位置と傾きを手で合わせる。計算機では、手持ちで撮った動画からカメラの動きを推定して手ぶれを打ち消し、早送りできる。Web では、スクロールに合わせて街を高速で移動する表示にする。

### 連続写真

![マイブリッジ「動く馬」](https://upload.wikimedia.org/wikipedia/commons/3/39/The_Horse_in_motion._%22Abe_Edgington%2C%22_owned_by_Leland_Stanford%3B_driven_by_C._Marvin%2C_trotting_at_a_2-24_gait_over_the_Palo_Alto_track%2C_15th_June_1878_LOC_13624627695.jpg)

画像: [The Horse in motion, 1878](https://commons.wikimedia.org/wiki/File:The_Horse_in_motion._%22Abe_Edgington,%22_owned_by_Leland_Stanford;_driven_by_C._Marvin,_trotting_at_a_2-24_gait_over_the_Palo_Alto_track,_15th_June_1878_LOC_13624627695.jpg)（エドワード・マイブリッジ、アメリカ議会図書館、著作権の制限なし）

::youtube[The horse in motion (Eadweard Muybridge) 1878]{id="heRuLp7CyTM"}

マイブリッジは走る馬の脚の動きを確かめるため、何台ものカメラを並べ、馬が通るとシャッターが順に切れる仕掛けを作った。カメラの台数とシャッターの仕掛けをそろえるのが大がかりだった。計算機を使えば、高速度撮影の動画からコマを抜き出して並べるだけで同じものが作れる。Web では、コマの一覧と、それをつないだ動きをスクロールで行き来できるようにする。

### ライトペインティング

::youtube[How to do Light Painting with a PixelStick]{id="xtt7TIZ_-2Q"}

長時間露光の間に光源を動かし、写真に光の軌跡で絵を描く。暗闇で自分の動きが見えないまま描くので、思いどおりの形になるまで何度も撮り直す。計算機を使うと、LED を一列に並べた棒が画像を 1 列ずつ順に光らせるので、棒を持って歩くだけで画像が写る。Web では、写真の上に光の軌跡を描き込めるページにする。

### フォトコラージュ（ジョイナー）

::youtube[David Hockney's Joiners]{id="-pNsfZYQeE0"}

ホックニーのように、少しずつ視点や時刻の違う写真を何十枚も撮って貼り合わせ、1 つの場面にする。どの写真をどこに重ねるかは、プリントを並べながら手で決める。計算機では、写真どうしに共通する特徴点から重なり方を求め、配置を自動で決められる。Web では、写真が 1 枚ずつ置かれて場面ができていく表示にする。

### ギガピクセル写真

::youtube[Making the Gigapixel Artzoom]{id="RwUWRRGEj_8"}

望遠レンズで風景を何千枚にも分けて撮り、継ぎ目なく貼り合わせて数十億画素の 1 枚にする。撮り漏れが出ないように撮影位置をずらし、膨大な枚数の位置を合わせる必要がある。計算機を使えば、ロボット雲台が撮影位置を自動で動かし、合成もソフトが特徴点をもとに行う。Web では、街全体から 1 人の顔まで寄れるズームビューアにする。

## 1 コマずつ作る動き

### ピンスクリーン・アニメーション

::youtube[Animation on the Alexeïeff-Parker pinscreen]{id="0A5pWqZhJSk"}

数十万本のピンを刺した板に横から光を当て、ピンの出し具合でできる影の濃淡で絵を作るアニメーションである。1 コマごとにピンを押し直して絵を作り変えるので、数分の作品に何年もかかる。計算機では、画像の明るさから各ピンの高さを決め、影を光の計算で描ける。Web では、マウスでピン面をなでると絵が浮かぶページにする。

### ロトスコープ

![ロトスコープの特許の図](https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/US_patent_1242674_figure_3.png/960px-US_patent_1242674_figure_3.png)

画像: [US patent 1242674 figure 3](https://commons.wikimedia.org/wiki/File:US_patent_1242674_figure_3.png)（マックス・フライシャーの特許、パブリックドメイン）

::youtube[The trick that made animation realistic]{id="IS1hCSsmH1E"}

実写の映像を 1 コマずつ紙に写してなぞり、動きの自然なアニメーションにする。数分の映像でも数千枚をなぞる必要がある。計算機では、各フレームに輪郭抽出や画風の変換を自動でかけ、前後のコマで線がぶれないようにそろえられる。Web では、実写となぞった絵をスライダーで見比べられるようにする。

### 3D ゾートロープ

::youtube[Pixar Toy Story 3D Zoetrope]{id="biG20MFGBNA"}

少しずつ形の違う立体を円盤に並べて回転させ、回転に同期したストロボで照らすと、立体が動いて見える。動きの各コマに対応する立体をすべて造形する必要がある。計算機では、3D アニメーションの各コマを書き出して 3D プリントできる。Web では、回転の速さを操作させ、立体が止まって見える速さを探させる。

### ピクシレーション

::youtube[Her Morning Elegance / Oren Lavie]{id="2_HXUhShhmY"}

人間や実物を 1 コマごとに少し動かして撮るストップモーションである。数分の映像に数千枚の撮影が要り、被写体の人は撮影のたびに同じ姿勢を取り直す。計算機では、撮影したコマの間をフレーム補間モデルで埋め、撮影枚数を減らせる。Web では動画として出し、スクロールでコマ送りできるようにする。

### パラパラ漫画

::youtube[Pencil Flipbook: Constalation Prize]{id="hio2CGVLihY"}

紙の束の 1 枚ごとに少しずつ違う絵を描き、めくって動かす。滑らかに動かすには、1 秒あたり十数枚を手で描く必要がある。計算機では、要所の絵（原画）の間をつなぐ絵（中割り）をモデルで生成できる。Web では、スクロールでページをめくる表示にする。

### ピタゴラ装置

::youtube[OK Go - This Too Shall Pass - Rube Goldberg Machine]{id="qybUFnY7Y8w"}

球や仕掛けが次々に連鎖して、最後に目的の動作を起こす装置である。1 か所でも失敗すると最初からやり直しになるので、連鎖が通るまで組み直しと撮り直しを繰り返す。計算機では、部品の配置を物理シミュレーションで試し、連鎖が通るかを組む前に確かめられる。Web では、閲覧者が部品を置いて連鎖を作れるシミュレーションにする。

### ASCII アートの動画

::youtube[FPS using ASCII chars test]{id="fW-pDkDvcfE"}

文字の形の濃さだけで陰影を表した絵を、動画の全フレームに作る。1 枚でも文字の選び方に手間がかかり、動画では何千枚分になる。計算機では、画面を文字の大きさの区画に分け、各区画の明るさや形に最も近い文字を選ぶ処理をリアルタイムにかけられる。Web では、DOM のテキストとして動画を再生する。

### キネティック・タイポグラフィ

::youtube[Toy Story - "You Are A Toy" Kinetic Typography]{id="_PU49-_qQoI"}

台詞や歌詞の文字を、音に合わせて動かしたり変形させたりする映像である。1 語ごとに出る時刻を音に合わせ、動きをキーフレームで付ける作業が多い。計算機では、音声認識と強制アラインメントで語ごとの時刻を取り、動きのテンプレートを自動で割り当てられる。Web では、音声に合わせて DOM の文字が動くページにする。

### サンドアニメーション

::youtube[Kseniya Simonova Incredible Sand Art]{id="9zLa-o7ZeiQ"}

下から光を当てたガラス台の上で砂を手で動かし、絵を描いては崩して次の場面へ変えていく。上演はやり直しが利かず、録画しても場面ごとの修正ができない。計算機では、砂の流れを粒子のシミュレーションで描ける。Web では、マウスで砂を描いたり払ったりできるページにする。

### クレイアニメ

::youtube[How Stop-Motion Movies Are Animated at Aardman]{id="jZvQzkFcKEM"}

粘土の人形を少しずつ変形させ、1 コマずつ撮る。1 日の撮影で数秒分しか進まない。計算機では、コマの間をモデルで補間でき、台詞に合わせた口の形の差し替えも音声から自動で選べる。Web では、粘土の人形を変形させてコマを作れるページにする。

### ドローンショー

::youtube[How Drone Shows Work]{id="7fKfBb7x9WQ"}

LED を積んだ数百〜数千機のドローンを夜空に並べ、点の集まりで絵を描き、絵から絵へ形を変える。各機体をどの点へ向かわせ、互いにぶつからない経路をどう通すかを決める必要がある。計算機では、移動距離が最小になる機体と点の割り当てを解き、衝突しない経路を計算する。Web では、好きな絵を入れると点の群れが形を変える 3D シミュレーションにする。

## 紙と立体

### ポップアップ絵本

::youtube[The Definitive Pop-Up Book "Encyclopedia Prehistorica Dinosaurs"]{id="TaEi3VWniKE"}

ページを開くと、折り込まれた紙の構造が立ち上がる。開く角度に応じて正しく立ち上がり、閉じると平らに収まる折り線と切れ目を、試作を繰り返して設計する。計算機では、立ち上げたい 3D の形から、折り線と切れ目の展開図を逆算できる。Web では、開く角度に合わせて紙が立ち上がるシミュレーションにする。

### 複雑な折り紙

::youtube[Ryujin 3.5 origami time lapse]{id="OXqJ9PFsBpI"}

神谷哲史の「龍神」のように、1 枚の正方形の紙から切らずに複雑な形を折り出す。目標の形を折れる展開図（折り線の配置）の設計にも、数百の手順を正確に折る作業にも膨大な時間がかかる。計算機では、TreeMaker や Origamizer のようなソフトで、形から展開図を計算できる。Web では、[Origami Simulator](https://origamisimulator.org/) のように、展開図が折り上がる過程を 3D で見せる。

### シャドーボックス

::youtube[DIY 3D PaperCut Shadow Box]{id="qH17lUGZxWA"}

何層もの切り絵を間隔を空けて重ね、後ろから照らして奥行きのある絵にする。1 枚の絵をどの層に分け、各層をどんな形に切り抜くかを決めるのが大変である。計算機では、画像の奥行きをモデルで推定して層に分け、各層をカッティングマシンで切れる。Web では、層が離れて重なっている様子を 3D で見せる。

### 等高線の立体地図

::youtube[How to make a 3d map]{id="AZ7lWrqidgk"}

等高線ごとに紙や板を切り抜き、積み重ねて地形の模型を作る。地図から等高線を 1 本ずつ写し取り、層の数だけ切る必要がある。計算機では、標高データから各高さの輪郭を取り出し、レーザーカッターで切れる。Web では、好きな場所の地形を層に分けて 3D で見せる。

### 一枚切りの切り絵

::youtube[Paper Cut Portrait Process]{id="dCzf1w1RFw0"}

1 枚の紙から、すべての部分が紙の中でつながったまま絵を切り出す。切り抜いた部分が離れて落ちないよう、残す線のつながりを考えながら下絵を描く必要がある。計算機では、画像を白と黒の領域に分け、黒い部分が 1 つにつながるよう細い橋を自動で足した型紙を作れる。Web では、写真から切り絵の型紙を作るページにする。

## 音

### スペクトログラムに絵を描く

::youtube[Aphex Twin Spectrogram]{id="M9xMuPWAZW8"}

音を時間と周波数の図（スペクトログラム）で見たとき、絵が浮かぶように音を作る。Aphex Twin の曲に隠された顔が有名である。どの時刻にどの周波数の音をどれだけ鳴らすかを、絵の画素ごとに決める必要がある。計算機では、画像をそのままスペクトログラムとみなし、逆短時間フーリエ変換で音の波形に戻せる。Web では、音を再生しながらスペクトログラムを描き、絵が現れる様子を見せる。

### バーチャル合唱

::youtube[Eric Whitacre's Virtual Choir - Lux Aurumque]{id="D7o7BrlbaDs"}

世界中の数百人が自宅で別々に録った歌の映像を、1 つの合唱として重ねる。全員の録音の開始位置とテンポのずれを合わせ、映像を並べる編集に膨大な時間がかかる。計算機では、各録音を基準の音源に対して自動で時間合わせし、音程のずれも補正できる。Web では、声部ごとの音量を変えながら聴けるプレイヤーにする。

### 動画の断片で作る曲

::youtube[Kutiman - Thru You Too - GIVE IT UP]{id="WoHxoz_0ykI"}

Kutiman は、他人が YouTube に上げた演奏動画の断片だけを集め、1 曲に編集した。調とテンポの合う素材を大量の動画から探し、切り出して組み合わせるのに膨大な時間がかかる。計算機では、音源分離で楽器ごとの音を取り出し、調やテンポなどの特徴量で素材を検索できる。Web では、断片ごとに元の動画へ飛べるプレイヤーにする。

### 話すピアノ

::youtube[Speaking Piano]{id="muCPjK4nGY4"}

人の声を録音し、その周波数成分をピアノの鍵盤の組み合わせで再現すると、ピアノが話しているように聞こえる。Peter Ablinger の作品が有名である。声を細かい時間に区切り、区間ごとにどの鍵をどの強さで弾くかを決める必要がある。計算機では、声を短い区間ごとに周波数分析し、各鍵の周波数の強さを打鍵の強さに変換して自動演奏ピアノに弾かせる。Web では、録音した声をその場でピアノの音に変換するページを作る。

## 言葉

### 完全パングラム

![いろはを使ったかるた](https://upload.wikimedia.org/wikipedia/commons/3/35/New_Edition_of_Iroha_Brigade_Characters_%28Shinpan_iroha_kumiji%29.jpg)

画像: [New Edition of Iroha Brigade Characters](<https://commons.wikimedia.org/wiki/File:New_Edition_of_Iroha_Brigade_Characters_(Shinpan_iroha_kumiji).jpg>)（Smithsonian Institution、CC0）

いろは歌のように、すべてのかなをちょうど 1 回ずつ使って意味の通る文を作る。残りのかなを常に管理しながら、文として成り立つ語の組み合わせを探す必要がある。計算機では、辞書の語の組み合わせを探索して候補を作り、言語モデルで文としての自然さを評価できる。Web では、かなが並べ替わって次々に別の歌になるページを作る。

### 長い回文

前から読んでも後ろから読んでも同じで、意味も通る長い文を作る。片側に語を足すと反対側の文字も決まってしまうので、両側で意味が通る語を探し続ける必要がある。計算機では、中心から両側へ辞書の語を伸ばす探索をし、言語モデルで文の自然さを評価できる。Web では、中心から左右に同時に文字が伸びていく表示にする。

### 折句・アクロスティック

![各行の頭の文字をつなぐと名前になる 1850 年の詩](https://upload.wikimedia.org/wikipedia/commons/1/10/1850_acrostic_Dearborn.png)

画像: [1850 acrostic Dearborn](https://commons.wikimedia.org/wiki/File:1850_acrostic_Dearborn.png)（Nathaniel Dearborn、パブリックドメイン）

各行の最初の文字をつなげると別の語になるように詩を書く。行頭の文字が決まった状態で、各行を詩として意味の通る文にする必要がある。計算機では、行頭の文字を制約として言語モデルに生成させられる。Web では、行頭の文字が浮かび上がって隠れた語が現れる表示にする。

### リポグラム

特定の文字を一切使わずに文章を書く。ジョルジュ・ペレックは e を使わない長編小説『[煙滅](https://en.wikipedia.org/wiki/A_Void)』を書いた。よく使う文字を禁じると、言い換えを探し続けることになる。計算機では、言語モデルの生成時に、禁止した文字を含むトークンの確率を 0 にして選ばれないようにする。Web では、閲覧者が禁止する文字を選ぶと、文章がその場で書き換わるページにする。

### クロスワードの作成

::youtube[How to Create a Crossword Puzzle]{id="aAqQnXHd7qk"}

縦と横に交差するすべての語が実在の語になるように、盤面を文字で埋める。1 文字を変えると交差する語がすべて変わるので、テーマに沿う語でそろえるのは特に難しい。計算機では、制約充足問題として盤面を埋める探索をし、ヒントの文を言語モデルで作れる。Web では、閲覧者がテーマを入れるとその場で盤面ができるページにする。
