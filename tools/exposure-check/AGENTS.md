# exposure-check

このワークスペースは、Cloudflare Access の背後のものと private のリポジトリが外から届かないことを 1 時間ごとに確かめる。対象は、Cloudflare のアカウントの今の状態と、credential broker の D1 に残したこれまでに見た対象の記録から読む。ログには件数だけを出し、詳しい内容は broker を通して Claude に届く。
