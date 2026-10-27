// note: 画面を 4 つに分け、踊る人の映像と虹色の縞を、加算、スクリーン、乗算、差分のそれぞれで混ぜて並べる。縞はゆっくり流れ、混ぜ方による色の違いを見比べられる。
// text: 加算
// text: スクリーン
// text: 乗算
// text: 差分
void main() {
  vec2 cell = floor(uv * 2.0);
  vec2 q = fract(uv * 2.0);
  int mode = int(cell.y * 2.0 + cell.x);
  vec3 a = rgb(q);
  vec3 b = hsv(vec3(fract(q.x * 1.5 - q.y * 0.5 + time * 0.1), 0.8, 0.85));
  vec3 c;
  if (mode == 0) c = min(a + b * 0.6, 1.0);
  else if (mode == 1) c = 1.0 - (1.0 - a) * (1.0 - b);
  else if (mode == 2) c = a * b;
  else c = abs(a - b);
  vec2 labelCenter = (cell + vec2(0.12, 0.08)) * 0.5;
  float label = textBox(uv, labelCenter + vec2(0.0, 0.0), 0.05, mode);
  c = mix(c, vec3(0.0), textBox(uv + vec2(0.002, -0.003), labelCenter, 0.05, mode) * 0.7);
  c = mix(c, vec3(1.0), label);
  c = mix(c, vec3(0.0), step(abs(fract(uv.x * 2.0 + 0.5) - 0.5), 0.0) + step(min(abs(uv.x - 0.5) * aspect(), abs(uv.y - 0.5)), 0.003));
  outColor = vec4(c, 1.0);
}
