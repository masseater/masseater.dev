// note: タイプライターで記号を 1 字ずつ打って絵を作るように、濃さの違う記号のマスを左上から 1 行ずつ打っていき、6 秒で踊る人の 1 枚を打ち終える。
// glyphs: 　．：－＝＋＊＃％＠
void main() {
  vec2 grid = vec2(56.0, 24.0);
  float cycle = floor(time / 6.0);
  float typed = fract(time / 6.0) * grid.x * grid.y;
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float order = cell.y * grid.x + cell.x;
  vec3 paper = vec3(0.96, 0.94, 0.88);
  vec3 c = paper;
  if (order < typed) {
    float dark = pow(1.0 - luma(pastRgb((cell + 0.5) / grid, cycle * 6.0)), 1.6);
    float n = 11.0;
    float index = clamp(floor(dark * n), 0.0, n - 1.0);
    float glyph = glyphCell(local, 0, index);
    c = mix(paper, vec3(0.1, 0.1, 0.15) * (0.8 + 0.4 * hash(cell)), glyph);
  }
  float cursor = step(abs(order - floor(typed)), 0.5) * step(0.85, local.y);
  c = mix(c, vec3(0.8, 0.2, 0.2), cursor);
  outColor = vec4(c, 1.0);
}
