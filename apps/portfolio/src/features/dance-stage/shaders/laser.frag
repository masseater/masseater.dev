// note: 霧のかかった暗い会場で、床の 1 点から緑と赤のレーザーを扇のように広げて首を振らせ、奥の壁には踊る人の骨格を緑の線で描く。光は点滅させずに動かす。
void main() {
  vec3 c = rgb(uv) * 0.06;
  vec2 origin = vec2(0.5, 0.98);
  vec2 d = (uv - origin) * vec2(aspect(), 1.0);
  float a = atan(d.x, -d.y);
  float sweep = sin(time * 0.8) * 0.5;
  float fan = 0.0;
  for (int i = 0; i < 9; i++) {
    float target = (float(i) - 4.0) * 0.16 + sweep;
    fan += smoothstep(0.006, 0.0, abs(a - target)) * smoothstep(0.0, 0.3, length(d));
  }
  vec3 col = mix(vec3(0.2, 1.0, 0.3), vec3(1.0, 0.2, 0.2), step(0.5, fract(time / 6.0)));
  float haze = 0.6 + 0.4 * fbm(uv * 5.0 + time * 0.2);
  c += col * fan * haze;
  float sk = skeleton(uv);
  c += vec3(0.2, 1.0, 0.3) * smoothstep(0.004, 0.0, sk) * 1.2;
  c += vec3(0.2, 1.0, 0.3) * smoothstep(0.02, 0.0, sk) * 0.2;
  outColor = vec4(c, 1.0);
}
