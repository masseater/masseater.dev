// note: 画面を少しずつ形の違う三角形に分け、三角形ごとに中心の 1 色で塗る。角ばった三角形の集まりで踊る人と部屋を描く。
void main() {
  vec2 q = uv * vec2(aspect(), 1.0) * 18.0;
  vec2 cell = floor(q);
  vec2 f = fract(q);
  vec2 skew = vec2(hash(cell), hash(cell + 3.0)) * 0.4 - 0.2;
  float upper = step(f.x + skew.x, f.y + skew.y);
  vec2 center = (cell + mix(vec2(0.67, 0.33), vec2(0.33, 0.67), upper)) / 18.0 / vec2(aspect(), 1.0);
  vec3 c = rgb(center);
  c *= 0.92 + 0.12 * hash(cell + upper * 0.5);
  outColor = vec4(c, 1.0);
}
