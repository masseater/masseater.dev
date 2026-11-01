// note: マイブリッジの連続写真のように、0.1 秒ずつずらした 12 の瞬間を、番号付きの升目に順に並べる。並びは 1 秒ごとに先へ進む。
void main() {
  vec2 grid = vec2(4.0, 3.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float index = cell.y * 4.0 + cell.x;
  float t = floor(time) + index * 0.1;
  vec2 p = vec2(local.x * 0.6 + 0.25, local.y * 0.95 + 0.03);
  vec3 c = pastRgb(p, t);
  float l = luma(c);
  c = vec3(l * 1.05, l * 0.92, l * 0.75);
  float lines = step(0.95, fract(p.x * 20.0)) * (1.0 - pastMatte(p, t));
  c = mix(c, c * 0.6, lines);
  float border = step(local.x, 0.02) + step(0.98, local.x) + step(local.y, 0.02) + step(0.98, local.y);
  c = mix(c, vec3(0.05), min(border, 1.0));
  c = mix(c, vec3(0.98), number(local, vec2(0.04, 0.06), 0.13, index + 1.0, 2));
  outColor = vec4(c, 1.0);
}
