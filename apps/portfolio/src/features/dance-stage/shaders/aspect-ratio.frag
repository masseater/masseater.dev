// note: 画面の比率を、シネスコの横長、4:3、縦長の 9:16 のあいだで 4 秒ごとに滑らかに切り替える。黒い帯が上下や左右から出入りする。
void main() {
  float phase = mod(time / 4.0, 3.0);
  float a = 2.39;
  float b = 4.0 / 3.0;
  float c9 = 9.0 / 16.0;
  float ratio = phase < 1.0 ? mix(a, b, smoothstep(0.7, 1.0, phase)) : phase < 2.0 ? mix(b, c9, smoothstep(1.7, 2.0, phase)) : mix(c9, a, smoothstep(2.7, 3.0, phase));
  float screen = aspect();
  vec2 size = ratio > screen ? vec2(1.0, screen / ratio) : vec2(ratio / screen, 1.0);
  vec2 d = abs(uv - 0.5) * 2.0;
  float show = step(d.x, size.x) * step(d.y, size.y);
  vec2 p = (uv - 0.5) / max(size.x, size.y) * vec2(1.0) + vec2(0.0, 0.0);
  p = (uv - 0.5) + 0.5;
  outColor = vec4(rgb(p) * show, 1.0);
}
