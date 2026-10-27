// note: 縦長のショート動画の画面のように、真ん中に縦に切り出した踊りを置いて左右をぼかし、右に好き・コメント・共有の印、下に投稿の題と流れる曲名を出す。
// text: 踊ってみた #セイキンダンス
// text: ♪ セイキンダンス – オリジナル曲   ♪ セイキンダンス – オリジナル曲
void main() {
  float w = 0.5625 / aspect();
  float x0 = 0.5 - w * 0.5;
  vec3 c = blurRgb(uv, 0.03) * 0.5;
  if (abs(uv.x - 0.5) < w * 0.5) {
    vec2 q = vec2((uv.x - x0) / w, uv.y);
    vec2 p = vec2(bodyCenter().x + (q.x - 0.5) * w * 1.0, q.y);
    c = rgb(p);
    vec2 icons[3] = vec2[3](vec2(0.9, 0.5), vec2(0.9, 0.62), vec2(0.9, 0.74));
    for (int i = 0; i < 3; i++) {
      vec2 ip = vec2(x0 + icons[i].x * w, icons[i].y);
      c = mix(c, i == 0 ? vec3(1.0, 0.25, 0.35) : vec3(1.0), smoothstep(0.022, 0.018, dist(uv, ip)));
    }
    c = mix(c, c * 0.4, smoothstep(0.75, 1.0, uv.y));
    vec2 tq = (uv - vec2(x0 + 0.02, 0.86)) / vec2(0.035 * textAspect(0) / aspect(), 0.035);
    c = mix(c, vec3(1.0), text(tq, 0));
    float scroll = fract(time * 0.08) * 0.5;
    vec2 sq = (uv - vec2(x0 + 0.02, 0.92)) / vec2(0.03 * textAspect(1) / aspect(), 0.03);
    sq.x += scroll;
    c = mix(c, vec3(0.9), text(sq, 1) * step(uv.x, x0 + w * 0.75));
  }
  outColor = vec4(c, 1.0);
}
