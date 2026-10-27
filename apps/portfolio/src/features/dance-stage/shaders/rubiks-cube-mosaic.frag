// note: ルービックキューブを 24×13 個並べ、各キューブの正面の 9 マスを 6 色で塗って踊る人を描く。マスのあいだの黒い枠もキューブらしく残す。
void main() {
  vec3 colors[6] = vec3[6](vec3(0.95), vec3(0.95, 0.85, 0.1), vec3(0.85, 0.1, 0.1), vec3(0.95, 0.45, 0.05), vec3(0.1, 0.3, 0.85), vec3(0.1, 0.65, 0.25));
  vec2 grid = vec2(72.0, 39.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  vec3 target = rgb((cell + 0.5) / grid);
  vec3 best = colors[0];
  float score = 9.0;
  for (int i = 0; i < 6; i++) {
    vec3 d = colors[i] - target;
    float e = dot(d, d);
    if (e < score) { score = e; best = colors[i]; }
  }
  float sticker = step(0.1, local.x) * step(local.x, 0.9) * step(0.1, local.y) * step(local.y, 0.9);
  vec2 cube = fract(uv * grid / 3.0);
  float seam = step(cube.x, 0.03) + step(cube.y, 0.03);
  vec3 c = mix(vec3(0.04), best * (0.92 + 0.08 * (1.0 - local.y)), sticker * (1.0 - min(seam, 1.0)));
  outColor = vec4(c, 1.0);
}
