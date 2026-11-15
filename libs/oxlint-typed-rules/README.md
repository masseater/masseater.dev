# oxlint-typed-rules

型情報を要る ESLint のルールを、oxlint の JS プラグインとして動かす。
oxlint の JS プラグインには型情報が渡らないので（[oxc#19596](https://github.com/oxc-project/oxc/issues/19596)）、
TypeScript 7 の API で Program と型検査器を作り、ルールが読む `parserServices` を用意する。
ESLint を入れずに、型情報を使うルールを oxlint だけで回せる。

## 公開先

npm: [@r_masseater/oxlint-typed-rules](https://www.npmjs.com/package/@r_masseater/oxlint-typed-rules)

## 移植したルール

| エントリ                                          | 中身                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| `@r_masseater/oxlint-typed-rules/tanstack-start`  | [@tanstack/eslint-plugin-start][tanstack] の 2 ルール                          |
| `@r_masseater/oxlint-typed-rules/tanstack-query`  | [@tanstack/eslint-plugin-query][tanstack-query] 5.105.3 の全ルールと configs   |
| `@r_masseater/oxlint-typed-rules/tanstack-router` | [@tanstack/eslint-plugin-router][tanstack-router] 1.162.0 の全ルールと configs |
| `@r_masseater/oxlint-typed-rules/drizzle`         | [eslint-plugin-drizzle][drizzle] 0.2.3 の全ルールと configs                    |
| `@r_masseater/oxlint-typed-rules/remotion`        | [@remotion/eslint-plugin][remotion] 4.0.541 の全ルールと configs               |
| `@r_masseater/oxlint-typed-rules/react`           | [@eslint-react/eslint-plugin][eslint-react] 5.30.1 の全ルールと configs        |

## 性能

同じルールを ESLint（typescript-eslint）で動かした場合と比べた。
計測は 2026-11-03 に、次の条件で行った。

対象は [masseater.dev][masseater-dev] の `apps/portfolio/src`（238 ファイル）と、
持ち主の非公開のリポジトリにあるスライドの React アプリ（1,434 ファイル、5.2 万行）である。
oxlint の側は oxlint 1.90.0、oxlint-tsgolint 7.0.2005、TypeScript 7.1.0-beta で測った。
ESLint の側は ESLint 9.39.5、typescript-eslint 8.72.1（`projectService`）で測った。
`@tanstack/eslint-plugin-start` 0.1.0 が ESLint 10 に対応していないので、ESLint は 9 にした。
ESLint 側にも同じ patch を当て、両者が同じ違反を出すことを確かめた。
Node.js 26.13.0、4 コア、メモリ 16 GB の Linux で測った。
cold は OS のページキャッシュを捨ててからの 3 回の中央値である。
warm はページキャッシュの載った状態での 5 回の中央値で、ESLint の `--cache` は使っていない。
メモリは子プロセスの tsgo と tsgolint を含めた RSS の合計の最大値である。

[masseater-dev]: https://github.com/masseater/masseater.dev

masseater.dev の `apps/portfolio/src` の結果は次のとおりである。

| ルールとツール                       |    cold |    warm |   メモリ |
| ------------------------------------ | ------: | ------: | -------: |
| ルール無し・oxlint                   | 0.11 秒 | 0.06 秒 |    99 MB |
| ルール無し・ESLint                   | 6.29 秒 | 5.93 秒 | 1,288 MB |
| TanStack の 2 ルール・このパッケージ | 1.90 秒 | 1.61 秒 |   769 MB |
| TanStack の 2 ルール・ESLint         | 6.76 秒 | 5.75 秒 | 1,324 MB |
| `no-floating-promises`・tsgolint     | 1.22 秒 | 1.03 秒 |   796 MB |
| `no-floating-promises`・ESLint       | 7.15 秒 | 6.35 秒 | 1,395 MB |
| 3 ルール・このパッケージと tsgolint  | 2.84 秒 | 2.59 秒 | 1,449 MB |
| 3 ルール・ESLint                     | 7.53 秒 | 6.64 秒 | 1,416 MB |

スライドの React アプリの結果は次のとおりである。

| ルールとツール                       |     cold |     warm |   メモリ |
| ------------------------------------ | -------: | -------: | -------: |
| ルール無し・oxlint                   |  0.17 秒 |  0.06 秒 |   107 MB |
| ルール無し・ESLint                   |  7.69 秒 |  6.95 秒 | 1,700 MB |
| TanStack の 2 ルール・このパッケージ |  3.83 秒 |  3.81 秒 |   911 MB |
| TanStack の 2 ルール・ESLint         | 10.56 秒 |  9.70 秒 | 1,799 MB |
| `no-floating-promises`・tsgolint     |  1.04 秒 |  0.91 秒 |   697 MB |
| `no-floating-promises`・ESLint       |  8.96 秒 |  8.29 秒 | 1,737 MB |
| 3 ルール・このパッケージと tsgolint  |  4.79 秒 |  4.57 秒 | 1,500 MB |
| 3 ルール・ESLint                     | 11.00 秒 | 10.31 秒 | 1,763 MB |

TanStack の 2 ルールは、ESLint の 2.5〜3.6 倍の速さで、メモリは 5〜6 割で済む。

typescript-eslint のルールで oxlint に同じ名前のものがあれば、tsgolint で動かす。
このパッケージは、tsgolint に無いルールを ESLint 無しで動かすためのものである。
tsgolint と併せると、型の情報を tsgo と tsgolint で 2 度作り、メモリはそのぶん増える。

## ライセンス

MIT。同梱する元のプラグインのライセンスは `libs/oxlint-typed-rules/LICENSE` にある。
