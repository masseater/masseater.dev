// note: 踊りを暗くした上にゲームのメニューを出し、拍ごとに選んでいる項目を下へ移して、選んだ項目だけを大きくして弾ませ、矢印の印を付ける。
// text: はじめる
// text: つづきから
// text: せってい
// text: おわる
void main() {
  vec3 c = rgb(uv) * 0.45;
  c = mix(c, rgb(uv) * 0.8, matte(uv) * 0.5);
  int sel = int(mod(beatCount, 4.0));
  for (int i = 0; i < 4; i++) {
    float y = 0.3 + float(i) * 0.14;
    bool on = i == sel;
    float pop = on ? 1.0 + 0.25 * exp(-beat * 6.0) + 0.15 : 1.0;
    float h = 0.06 * pop;
    vec2 center = vec2(0.22, y - (on ? abs(sin(beat * PI * 2.0)) * 0.01 : 0.0));
    if (on) {
      float panel = step(abs(uv.x - 0.22) * aspect(), 0.3) * step(abs(uv.y - center.y), 0.05);
      c = mix(c, vec3(0.1, 0.3, 0.7), panel * 0.7);
      vec2 a = (uv - vec2(0.05, center.y)) * vec2(aspect(), 1.0);
      c = mix(c, vec3(1.0, 0.9, 0.3), step(abs(a.y), 0.022 - a.x * 0.8) * step(0.0, a.x));
    }
    c = mix(c, on ? vec3(1.0, 0.95, 0.5) : vec3(0.85), textBox(uv, center, h, i));
  }
  outColor = vec4(c, 1.0);
}
