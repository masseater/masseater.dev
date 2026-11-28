# holons

[holons.masseater.dev](https://holons.masseater.dev) にある、入れ子になったホロンの全体図を拡大縮小しながら見る静的ページ。

## 計測

本番へのデプロイのたびに、`deploy:production` が公開中のページを測る。結果は Actions の `deploy-measurements` アーティファクトに残る。

- `bin/measure-zoom.ts` は、決まったホイール、ダブルクリック、ボタンの入力を 5 回ずつ送る。デバイスピクセル比は実機相当の 1 と 3、CDP で模した 3 の 3 通り。
- 書き出す `report/zoom/zoom.json` には、フレームの間隔、長いアニメーションフレーム、ページに届いた入力、確定した viewBox の拡大率が入る。
- `web-vitals-flow` は読み込みの LCP と CLS を測る。ページにリンクが無いので INP は出ない。
- LCP が Lighthouse の合格点に届くまで、`web-vitals-flow` は記録だけしてデプロイを落とさない。

クラウドセッションでは `--chrome-flags="--no-sandbox --proxy-server=$HTTPS_PROXY"` を足して同じコマンドを動かす。
