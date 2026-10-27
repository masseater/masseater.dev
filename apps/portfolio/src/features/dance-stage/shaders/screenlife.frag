// note: パソコンの画面の録画だけで見せる。ビデオ通話の窓に踊りが映り、横のチャットに拍ごとに 1 件ずつ書き込みが増え、矢印のカーソルが画面の上を動く。
// text: 見て見て
// text: え、何この踊り
// text: セイキンダンスだよ
// text: 腕の角度すごい
// text: もう一回！
void main() {
  vec3 c = mix(vec3(0.25, 0.35, 0.55), vec3(0.45, 0.35, 0.6), uv.x);
  c = mix(c, vec3(0.92), step(uv.y, 0.04));
  vec2 win = (uv - vec2(0.04, 0.1)) / vec2(0.58, 0.72);
  if (inside(win) > 0.5) {
    c = mix(rgb(vec2(win.x, (win.y - 0.06) / 0.94)), vec3(0.85), step(win.y, 0.06));
    c = mix(c, vec3(0.9, 0.3, 0.3), step(length((win - vec2(0.03, 0.03)) * vec2(aspect(), 1.0)), 0.012));
  }
  vec2 chat = (uv - vec2(0.66, 0.1)) / vec2(0.3, 0.72);
  if (inside(chat) > 0.5) {
    c = vec3(0.97);
    float shown = min(mod(beatCount, 8.0), 5.0);
    for (int i = 0; i < 5; i++) {
      if (float(i) >= shown) break;
      vec2 center = vec2(0.66 + 0.15, 0.17 + float(i) * 0.12);
      vec2 bubble = (uv - center) / vec2(0.14, 0.04);
      c = mix(c, mod(float(i), 2.0) < 0.5 ? vec3(0.85, 0.92, 1.0) : vec3(0.88, 1.0, 0.88), step(max(abs(bubble.x), abs(bubble.y)), 1.0));
      c = mix(c, vec3(0.15), textBox(uv, center, 0.03, i));
    }
  }
  vec2 cursor = vec2(0.4 + 0.3 * sin(time * 0.7), 0.5 + 0.25 * sin(time * 1.1));
  vec2 k = (uv - cursor) * vec2(aspect(), 1.0);
  float arrow = step(0.0, k.x) * step(0.0, k.y) * step(k.x, k.y * 0.6) * step(k.y, 0.035);
  c = mix(c, vec3(0.0), arrow);
  outColor = vec4(c, 1.0);
}
