// note: 4 秒ごとに、影を主にした暗く重い画と、影をほとんど消した明るく軽い画とを切り替える。同じ踊りでも光の量だけで印象が変わる。
void main() {
  vec3 c = rgb(uv);
  float l = luma(c);
  float mode = step(0.5, fract(time / 8.0));
  vec3 low = c * pow(l, 1.2) * 1.2 * (0.3 + 0.7 * matte(uv)) * (1.0 - 0.6 * dist(uv, bodyCenter()));
  vec3 high = 1.0 - (1.0 - c) * 0.45;
  outColor = vec4(mix(low, high, mode), 1.0);
}
