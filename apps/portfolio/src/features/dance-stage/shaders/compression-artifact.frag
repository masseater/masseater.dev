// note: 8×8 の区画ごとに色を平均し、区画の中の明暗を 2 段階に丸めて、圧縮率を極端に上げた JPEG のブロックを作る。
void main() {
  float size = 8.0 + 8.0 * step(0.5, fract(time / 4.0));
  vec2 cell = floor(uv * resolution / size);
  vec2 base = cell * size / resolution;
  vec2 step2 = vec2(size) / resolution;
  vec3 mean = vec3(0);
  for (int y = 0; y < 4; y++) for (int x = 0; x < 4; x++) mean += rgb(base + (vec2(x, y) + 0.5) * step2 / 4.0);
  mean /= 16.0;
  vec2 local = fract(uv * resolution / size);
  vec3 gradient = rgb(base + step2 * vec2(0.75, 0.5)) - rgb(base + step2 * vec2(0.25, 0.5));
  vec3 c = mean + gradient * (floor(local.x * 2.0) - 0.5);
  outColor = vec4(floor(c * 6.0) / 6.0, 1.0);
}
