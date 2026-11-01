// note: 拍ごとに言葉を 1 つずつ、跳ねるように大きく出して傾ける。言葉は 4 つを順に繰り返し、出た瞬間にいちばん大きく、次の拍までに縮む。
// text: セイ
// text: キン
// text: ダンス
// text: ハイ！
void main() {
  vec3 c = rgb(uv) * 0.45;
  int word = int(mod(beatCount, 4.0));
  float pop = 1.0 + 0.5 * exp(-beat * 8.0);
  float tilt = (hash(vec2(beatCount, 3.0)) - 0.5) * 0.6;
  vec2 center = vec2(0.3 + 0.4 * hash(vec2(beatCount, 1.0)), 0.3 + 0.4 * hash(vec2(beatCount, 2.0)));
  vec2 p = rot((uv - center) * vec2(aspect(), 1.0), tilt) / vec2(aspect(), 1.0) + center;
  float t = textBox(p, center, 0.2 * pop, word);
  float shadow = textBox(p - vec2(0.006, 0.01), center, 0.2 * pop, word);
  c = mix(c, vec3(0.0), shadow * 0.7);
  c = mix(c, hsv(vec3(fract(beatCount * 0.27), 0.7, 1.0)), t);
  outColor = vec4(c, 1.0);
}
