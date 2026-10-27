// note: 4 秒ごとに画面を横へ素早く振り、強い横ぶれで流しながら、左右を反転して色を変えた別のカットへつなぐ。
void main() {
  float cycle = time / 4.0;
  float phase = fract(cycle);
  float k = smoothstep(0.82, 1.0, phase);
  float swing = k * 1.2;
  vec3 c = vec3(0);
  for (int i = 0; i < 24; i++) {
    float s = swing + float(i) / 24.0 * 0.25 * sin(k * PI);
    vec2 p = uv + vec2(s, 0.0);
    vec2 q = vec2(fract(p.x), p.y);
    vec3 a = rgb(q);
    vec3 b = rgb(vec2(1.0 - q.x, q.y)).bgr;
    float shot = mod(floor(cycle) + step(1.0, p.x), 2.0);
    c += mix(a, b, shot);
  }
  outColor = vec4(c / 24.0, 1.0);
}
