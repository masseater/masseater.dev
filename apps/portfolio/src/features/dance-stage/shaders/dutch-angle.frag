// note: 画面全体を 15 度ほど傾けたまま、ゆっくり左右に揺らす。傾いた水平線が落ち着かない感じを出す。
void main() {
  float a = 0.26 + 0.06 * sin(time * 0.6);
  vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
  q = rot(q, a) / 1.35;
  vec2 p = q / vec2(aspect(), 1.0) + 0.5;
  outColor = vec4(rgb(p), 1.0);
}
