// note: 縦と横の 2 つの振動を組み合わせた結び目のような線を、踊る人の上に重ねる。振動の比は 4 秒ごとに変わり、ずれの量は時間とともに回る。
void main() {
  vec3 c = rgb(uv) * 0.45;
  float ratios[4] = float[4](2.0, 3.0, 5.0, 4.0);
  float b = ratios[int(mod(floor(time / 4.0), 4.0))];
  float a = 3.0;
  float phase = time * 0.6;
  float d = 9.0;
  vec2 prev = vec2(0.5 + 0.4 * sin(phase) / aspect(), 0.5);
  for (int i = 1; i <= 200; i++) {
    float t = float(i) / 200.0 * 2.0 * PI;
    vec2 p = vec2(0.5 + 0.4 * sin(a * t + phase) / aspect() * 1.6, 0.5 + 0.4 * sin(b * t));
    d = min(d, segment(uv, prev, p));
    prev = p;
  }
  c += vec3(0.3, 1.0, 0.7) * smoothstep(0.004, 0.0, d);
  outColor = vec4(c, 1.0);
}
