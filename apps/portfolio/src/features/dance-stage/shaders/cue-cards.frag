// note: 白い紙に書いた歌詞を胸の前に持ち、拍ごとに一番前の紙を落として次の紙を見せる。落ちる紙は回りながら下へ消える。
// text: セイ
// text: キン
// text: ダンス
// text: 腕を上げ
// text: 膝を曲げ
// text: また上げる
void main() {
  vec3 c = rgb(uv);
  int card = int(mod(beatCount, 6.0));
  int next = int(mod(beatCount + 1.0, 6.0));
  vec2 hold = (joint(11) + joint(12)) * 0.5 + vec2(0.0, 0.12);
  vec2 size = vec2(0.24, 0.16);
  vec2 local = (uv - hold) / size + 0.5;
  if (inside(local) > 0.5) {
    c = vec3(0.97, 0.96, 0.92);
    c = mix(c, vec3(0.1), textBox(uv, hold, 0.08, next));
  }
  float fall = beat;
  vec2 dropAt = hold + vec2(0.05 * fall, fall * fall * 0.6);
  vec2 q = rot((uv - dropAt) * vec2(aspect(), 1.0), fall * 1.5) / vec2(aspect(), 1.0);
  vec2 l2 = q / size + 0.5;
  if (inside(l2) > 0.5 && fall < 0.95) {
    c = vec3(0.98, 0.97, 0.94) * (0.9 + 0.1 * l2.y);
    c = mix(c, vec3(0.1), textBox(q + hold, hold, 0.08, card));
  }
  outColor = vec4(c, 1.0);
}
