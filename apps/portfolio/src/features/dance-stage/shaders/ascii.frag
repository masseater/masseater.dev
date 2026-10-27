// note: 画面を文字の升目に区切り、升目の明るさに合う濃さの文字（. : * o & 8 @ #）を 5×5 の点で描く。
float glyph(int n, vec2 p) {
  p = floor(p * vec2(-4.0, 4.0) + 2.5);
  if (clamp(p.x, 0.0, 4.0) != p.x || clamp(p.y, 0.0, 4.0) != p.y) return 0.0;
  int a = int(round(p.x) + 5.0 * round(p.y));
  return float((n >> a) & 1);
}
void main() {
  vec2 cellSize = vec2(8.0, 12.0);
  vec2 cell = floor(uv * resolution / cellSize);
  vec2 center = (cell + 0.5) * cellSize / resolution;
  vec3 c = rgb(center);
  float l = luma(c);
  int n = 4096;
  if (l > 0.2) n = 65600;
  if (l > 0.3) n = 332772;
  if (l > 0.4) n = 15255086;
  if (l > 0.5) n = 23385164;
  if (l > 0.6) n = 15252014;
  if (l > 0.7) n = 13199452;
  if (l > 0.8) n = 11512810;
  vec2 local = fract(uv * resolution / cellSize) * 2.0 - 1.0;
  float on = glyph(n, local * vec2(1.0, 0.8) * 1.2);
  outColor = vec4(mix(vec3(0.03), c * 1.3, on), 1.0);
}
