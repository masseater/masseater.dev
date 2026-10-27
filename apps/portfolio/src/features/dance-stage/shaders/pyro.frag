// note: 4 拍ごとに舞台の床の 3 か所から火柱を 1 秒上げ、その周りに火花を飛ばす。炎の光で踊る人と部屋が橙に照らされる。
void main() {
  float on = step(mod(beatCount, 4.0), 0.5) * (1.0 - smoothstep(0.7, 1.0, beat));
  vec3 c = rgb(uv) * (0.6 + vec3(0.7, 0.35, 0.1) * on);
  float fire = 0.0;
  for (int i = 0; i < 3; i++) {
    float x = 0.15 + float(i) * 0.35;
    float h = 0.6 * smoothstep(0.0, 0.15, beat) * on;
    float y = 1.0 - uv.y;
    float n = fbm(vec2(uv.x * 10.0 + float(i), uv.y * 6.0 + time * 5.0));
    float shape = smoothstep(0.06 + y * 0.05, 0.0, abs(uv.x - x) * aspect() * (0.8 + n)) * smoothstep(h, h * 0.4, y) * step(0.001, h);
    fire += shape * (0.6 + n);
    for (int k = 0; k < 8; k++) {
      vec2 seed = vec2(float(i * 8 + k), floor(beatCount / 4.0));
      vec2 v = vec2((hash(seed) - 0.5) * 0.6, -0.8 - hash(seed + 1.0) * 0.6);
      vec2 p = vec2(x, 1.0) + v * beat + vec2(0.0, 0.9) * beat * beat;
      fire += smoothstep(0.006, 0.0, dist(uv, p)) * on * 2.0;
    }
  }
  vec3 flame = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.95, 0.6), clamp(fire - 0.6, 0.0, 1.0));
  c = mix(c, flame, clamp(fire, 0.0, 1.0));
  outColor = vec4(c, 1.0);
}
