// note: 切り紙のような太い帯と踊る人の黒い影だけで、作品の題名を見せる。帯は拍ごとに画面を横切って入れ替わり、題名は中央に一度だけ組み上がる。
// text: セイキンダンス
void main() {
  vec3 bg = vec3(0.95, 0.45, 0.15);
  vec3 c = bg;
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float y = 0.12 + fi * 0.18;
    float x = fract(hash(vec2(fi, 1.0)) + (beatCount + beat) * 0.12 * (mod(fi, 2.0) * 2.0 - 1.0));
    float bar = step(abs(uv.y - y), 0.035) * step(abs(fract(uv.x - x + 0.5) - 0.5), 0.2 + 0.1 * hash(vec2(fi, 2.0)));
    c = mix(c, mod(fi, 2.0) < 0.5 ? vec3(0.08) : vec3(0.98, 0.95, 0.85), bar);
  }
  vec2 p = (uv - vec2(0.72, 0.5)) / 0.9 + vec2(0.56, 0.5);
  c = mix(c, vec3(0.06), matte(p) * inside(p));
  float build = smoothstep(0.0, 0.3, fract(time / 9.6));
  float title = textBox(uv, vec2(0.3, 0.5), 0.1, 0) * step(uv.x, 0.3 - 0.35 + build * 0.7);
  c = mix(c, vec3(1.0), title);
  outColor = vec4(c, 1.0);
}
