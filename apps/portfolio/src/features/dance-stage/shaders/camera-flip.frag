// note: 5 秒ごとにカメラを頭の上で振り回したように、画面全体を 0.6 秒で 1 回転させ、回っている間は回転方向に強くぶらす。回り終えると 2 秒先の踊りへつながる。
void main() {
  float cycle = floor(time / 5.0);
  float t = mod(time, 5.0);
  float k = smoothstep(4.2, 4.8, t);
  float spin = k * 2.0 * PI;
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = spin - float(i) * 0.08 * sin(k * PI);
    vec2 p = rot((uv - 0.5) * vec2(aspect(), 1.0), a) / vec2(aspect(), 1.0) * (1.0 + sin(k * PI) * 0.3) + 0.5;
    acc += rgbOr(p, vec3(0.1));
  }
  vec3 c = acc / 8.0;
  c = mix(pastRgb(uv, time + mod(cycle, 2.0) * 2.0), c, step(0.001, k) * step(k, 0.999));
  outColor = vec4(c, 1.0);
}
