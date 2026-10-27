// note: ガラス窓に 5 色の付箋を 1 枚 1 画素として貼り、踊る人を描く。暗い所ほど濃い色の付箋を使い、明るい所は付箋を貼らずに窓のままにする。付箋は 1 枚ずつ少し傾ける。
void main() {
  vec2 grid = vec2(48.0, 27.0);
  vec2 cell = floor(uv * grid);
  vec2 local = rot(fract(uv * grid) - 0.5, (hash(cell) - 0.5) * 0.12) + 0.5;
  vec3 colors[5] = vec3[5](vec3(0.25, 0.4, 0.85), vec3(0.3, 0.7, 0.4), vec3(0.95, 0.45, 0.6), vec3(0.98, 0.6, 0.25), vec3(0.98, 0.9, 0.35));
  float tone = luma(rgb((cell + 0.5) / grid));
  float level = clamp(floor(tone / 0.13), 0.0, 4.0);
  vec3 best = colors[int(level)];
  float blank = step(0.68, tone);
  vec3 glass = mix(vec3(0.7, 0.8, 0.88), vec3(0.85, 0.9, 0.95), uv.y) * (0.9 + 0.1 * noise(uv * 6.0));
  float note = step(0.06, local.x) * step(local.x, 0.94) * step(0.06, local.y) * step(local.y, 0.94);
  vec3 c = mix(glass, best * (0.88 + 0.12 * local.y), note * (1.0 - blank));
  outColor = vec4(c, 1.0);
}
