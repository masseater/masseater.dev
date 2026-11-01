// note: 隣どうしの辺が波形に噛み合うタイルで平面を隙間なく埋め、タイルごとに踊る人を 1 人ずつ入れる。白と黒のタイルが交互に並び、中の人は別々の瞬間を踊る。
void main() {
  vec2 q = uv * vec2(aspect(), 1.0) * 4.0;
  q.y += 0.18 * sin(q.x * 2.0 * PI);
  q.x += 0.18 * sin(q.y * 2.0 * PI);
  vec2 cell = floor(q);
  vec2 local = fract(q);
  float checker = mod(cell.x + cell.y, 2.0);
  vec3 tile = mix(vec3(0.92, 0.88, 0.8), vec3(0.15, 0.13, 0.2), checker);
  vec3 figure = mix(vec3(0.15, 0.13, 0.2), vec3(0.92, 0.88, 0.8), checker);
  vec2 p = vec2(local.x * 0.6 + 0.25, local.y);
  float m = pastMatte(p, time + hash(cell) * DURATION);
  outColor = vec4(mix(tile, figure, m), 1.0);
}
