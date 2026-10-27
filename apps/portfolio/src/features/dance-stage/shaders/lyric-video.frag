// note: 曲の拍に合わせて言葉を 1 つずつ差し替え、出た瞬間だけ大きく弾ませる。拍は音声から推定した時刻を使う。
// text: セイキン
// text: ダンス
// text: ひらり
// text: くるり
void main() {
  vec3 c = rgb(uv) * 0.7;
  int row = int(mod(beatCount, 4.0));
  float pop = 1.0 + 0.35 * exp(-beat * 9.0);
  float shadow = textBox(uv - vec2(0.006, -0.01), vec2(0.5, 0.8), 0.17 * pop, row);
  float a = textBox(uv, vec2(0.5, 0.8), 0.17 * pop, row);
  c = mix(c, vec3(0.05), shadow * 0.6);
  c = mix(c, vec3(1.0, 0.92, 0.35), a);
  outColor = vec4(c, 1.0);
}
