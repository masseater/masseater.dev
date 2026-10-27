// note: 滑らかな乱数で決めた流れの向きに沿って、画の色を 16 歩ずつたどって混ぜる。画全体が流れる筋の集まりになり、筋はゆっくり向きを変える。
vec2 flowDir(vec2 p) {
  float a = fbm(p * 2.5 + time * 0.05) * 6.28 * 2.0;
  return vec2(cos(a), sin(a));
}
void main() {
  vec2 p = uv;
  vec3 s = vec3(0.0);
  float w = 0.0;
  for (int i = 0; i < 16; i++) {
    float grain = hash(floor(p * resolution / 2.0));
    s += rgb(p) * grain;
    w += grain;
    p += flowDir(p) * 0.0035 / vec2(aspect(), 1.0);
  }
  vec3 c = s / max(w, 0.001);
  c = mix(c, rgb(uv), matte(uv) * 0.3);
  outColor = vec4(c, 1.0);
}
