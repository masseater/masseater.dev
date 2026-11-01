// note: 左に映像を作るコードの行を並べ、2 拍ごとに 1 行ずつ書き換わったように光らせる。光った行に合わせて右の映像の加工が、色の反転、万華鏡、ずらし、色相回しと入れ替わる。
// text: dance().invert()
// text: dance().kaleid(6)
// text: dance().shift(0.02)
// text: dance().hue(time)
void main() {
  int active_ = int(mod(floor(beatCount / 2.0), 4.0));
  vec2 p = uv;
  vec3 c;
  if (active_ == 1) {
    vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
    float a = mod(atan(q.y, q.x), PI / 3.0);
    a = min(a, PI / 3.0 - a);
    p = vec2(cos(a), sin(a)) * length(q) / vec2(aspect(), 1.0) + bodyCenter();
  }
  c = rgb(p);
  if (active_ == 0) c = 1.0 - c;
  if (active_ == 2) c = vec3(rgb(p + vec2(0.02, 0.0)).r, c.g, rgb(p - vec2(0.02, 0.0)).b);
  if (active_ == 3) c = hsv(vec3(fract(luma(c) + time * 0.2), 0.7, luma(c) + 0.2));
  vec3 panel = vec3(0.06, 0.07, 0.09);
  for (int i = 0; i < 4; i++) {
    vec2 left = vec2(0.03, 0.2 + float(i) * 0.15);
    float h = 0.05;
    float width = h * textAspect(i) / aspect();
    float t = textBox(uv, left + vec2(width * 0.5, 0.0), h, i);
    vec3 ink = i == active_ ? vec3(1.0, 0.85, 0.3) : vec3(0.5, 0.75, 0.6);
    c = mix(c, panel, step(abs(uv.y - left.y), 0.04) * step(uv.x, 0.45) * 0.75);
    c = mix(c, ink, t);
  }
  outColor = vec4(c, 1.0);
}
