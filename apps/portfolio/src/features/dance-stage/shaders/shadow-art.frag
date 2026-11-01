// note: 部屋の真ん中に、積み木をでたらめに積んだような塊を置く。塊そのものは何の形にも見えないが、横から光を当てた壁の影だけが踊る人の形になる。
void main() {
  vec3 wall = mix(vec3(0.82, 0.8, 0.76), vec3(0.6, 0.58, 0.55), uv.y);
  float floorY = 0.78;
  vec3 c = uv.y > floorY ? mix(vec3(0.45, 0.38, 0.32), vec3(0.3, 0.25, 0.2), (uv.y - floorY) * 4.0) : wall;
  vec2 sp = vec2((uv.x - 0.55) * 1.25 + 0.5, uv.y * 1.05);
  float shadow = matte(sp) * step(uv.y, floorY);
  c = mix(c, c * 0.35, shadow);
  c += vec3(1.0, 0.9, 0.7) * 0.15 * exp(-dist(uv, vec2(0.05, 0.3)) * 3.0);
  vec2 grid = vec2(16.0, 12.0);
  for (int i = 0; i < 16; i++) for (int j = 0; j < 12; j++) {
    vec2 cell = vec2(float(i), float(j));
    if (matte((cell + 0.5) / grid) < 0.5) continue;
    float lift = (hash(cell) - 0.5) * 0.12;
    vec2 center = vec2(0.16 + (cell.x + 0.5) / grid.x * 0.22 + lift * 0.4, 0.42 + (cell.y + 0.5) / grid.y * 0.38 + lift);
    vec2 d = (uv - center) * vec2(aspect(), 1.0);
    vec2 half_ = vec2(0.03, 0.03);
    if (abs(d.x) < half_.x && abs(d.y) < half_.y) {
      float shade = 0.55 + 0.45 * hash(cell + 1.3);
      c = vec3(0.55, 0.42, 0.3) * shade * (d.x < -0.02 ? 1.2 : 1.0);
    }
  }
  outColor = vec4(c, 1.0);
}
