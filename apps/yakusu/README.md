# yakusu

[PLaMo 3 Translate 0.8B](https://huggingface.co/pfnet/plamo-3-translate-0.8b) を手元の PC で動かす翻訳アプリである。
文章を入れると、入力の手を止めたところで訳文が流れるように出る。訳す文章は PC の外へ出ない。

| 特徴               | 内容                                         |
| ------------------ | -------------------------------------------- |
| 言語の自動判定     | 原文の言語の判定と、日本語・英語の自動の切替 |
| 53 言語            | モデルカードに載っている言語すべて           |
| 日本語の文体の指定 | 自動・です・ます・であるの 3 つから選ぶ      |
| 長文の分割         | 1000 文字ごとに空行で区切って順に訳す        |

[Releases](https://github.com/masseater/masseater.dev/releases?q=yakusu) から、使う OS のファイルを落として開く。

| OS                     | ファイル                     |
| ---------------------- | ---------------------------- |
| Windows 10・11（x64）  | `yakusu_x.y.z_x64-setup.exe` |
| macOS（Apple Silicon） | `yakusu_x.y.z_aarch64.dmg`   |
| Linux（x64）           | `.deb` または `.AppImage`    |

インストーラーには [llama.cpp](https://github.com/ggml-org/llama.cpp) の llama-server が入っている。モデル（約 570 MB）は初回の起動で Hugging Face から取得するので、初回だけネットワークが要る。macOS では署名をしていないので、初回は Finder でアプリを右クリックして「開く」を選ぶ。

モデルは [PLaMo Community License](https://huggingface.co/pfnet/plamo-3-translate-0.8b-GGUF/blob/main/LICENSE/ja) に従って使っていて、ライセンスの写しはインストール先の `licenses/` にある。

Built with PLaMo
