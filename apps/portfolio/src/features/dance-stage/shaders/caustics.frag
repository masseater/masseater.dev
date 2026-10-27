// note: 揺れる水面越しの光が壁に映す明るい網目を描く。光の集まる網目が 6 秒ごとに寄り集まって、壁に踊る人の明るさの絵を結び、またほどける。
float caustic(vec2 uv2) {
  vec2 p = mod(uv2 * 2.0 * PI, 2.0 * PI) - 250.0;
  vec2 i = p;
  float c = 1.0;
  for (int n = 0; n < 5; n++) {
    float t = time * 0.5 * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / 0.005), p.y / (cos(i.y + t) / 0.005)));
  }
  c /= 5.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}
void main() {
  float phase = fract(time / 6.0);
  float form = smoothstep(0.2, 0.45, phase) * (1.0 - smoothstep(0.75, 0.95, phase));
  float light = caustic(uv * vec2(aspect(), 1.0) * 1.5);
  float image = pow(luma(blurRgb(uv, 0.004)), 2.2) * 1.3;
  float v = mix(light, image * (0.85 + 0.3 * light), form);
  vec3 c = vec3(0.04, 0.06, 0.1) + vec3(0.75, 0.9, 1.0) * v;
  outColor = vec4(c, 1.0);
}
