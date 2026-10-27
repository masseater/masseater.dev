// note: 人物の左右を結ぶ線の同じ側から撮った画どうしをつなぐと向きがそろう。前半はそのまま寄りと引きをつなぎ、後半は線を越えて左右が逆になる画をつなぐので、向きが急に入れ替わって見える。
// text: 線を越えない
// text: 線を越える
void main() {
  float half_ = step(4.8, mod(time, 9.6));
  float shot = mod(floor(time / 1.2), 2.0);
  vec2 p = shot > 0.5 ? (uv - 0.5) / 1.6 + bodyCenter() : uv;
  if (half_ > 0.5 && shot > 0.5) p.x = 1.0 - p.x;
  vec3 c = rgb(p);
  float label = textBox(uv, vec2(0.18, 0.08), 0.07, int(half_));
  c = mix(c, half_ > 0.5 ? vec3(1.0, 0.4, 0.3) : vec3(0.4, 1.0, 0.6), label);
  outColor = vec4(c, 1.0);
}
