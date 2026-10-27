// note: 画面全体を、入口から出口までどこへでも行ける 1 つの迷路にする。壁の太さを明るさで変えるので、迷路の壁が濃い所に踊る人の形が見える。
void main() {
  vec2 grid = vec2(96.0, 54.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float dark = 1.0 - luma(rgb((cell + 0.5) / grid));
  float right = step(0.5, hash(cell));
  if (cell.y >= grid.y - 1.0) right = 1.0;
  if (cell.x >= grid.x - 1.0) right = 0.0;
  float w = 0.08 + 0.3 * dark;
  float wallRight = (1.0 - right) * step(1.0 - w, local.x);
  float wallBottom = right * step(1.0 - w, local.y);
  float corner = step(1.0 - w, local.x) * step(1.0 - w, local.y);
  float wall = max(max(wallRight, wallBottom), corner);
  vec3 c = mix(vec3(0.97, 0.95, 0.9), vec3(0.12, 0.1, 0.2), wall);
  c = mix(c, vec3(0.9, 0.2, 0.2), step(dist(uv, vec2(0.005, 0.01)), 0.012) + step(dist(uv, vec2(0.995, 0.99)), 0.012));
  outColor = vec4(c, 1.0);
}
