// note: 踊る人の胸元を 4 倍に寄せて布の織り目まで見せ、ピントの合う帯を上下にゆっくり動かして、それ以外を大きくぼかす。手前には丸い光のぼけを浮かべる。
void main() {
  vec2 center = mix(joint(11), joint(12), 0.5) + vec2(0.0, 0.08);
  vec2 p = center + (uv - 0.5) / 4.0 + vec2(sin(time * 0.2), cos(time * 0.17)) * 0.01;
  float focus = 0.5 + 0.3 * sin(time * 0.5);
  float blur = abs(uv.y - focus) * 0.006;
  vec3 c = blurRgb(p, blur);
  float weave = 0.92 + 0.08 * sin(uv.x * resolution.x * 0.6) * sin(uv.y * resolution.y * 0.6);
  c *= mix(weave, 1.0, smoothstep(0.0, 0.1, abs(uv.y - focus)));
  for (int i = 0; i < 6; i++) {
    vec2 b = vec2(hash(vec2(float(i), 1.0)), hash(vec2(float(i), 2.0)));
    float d = dist(uv, b);
    c += vec3(1.0, 0.95, 0.85) * smoothstep(0.08, 0.07, d) * 0.12;
  }
  outColor = vec4(c, 1.0);
}
