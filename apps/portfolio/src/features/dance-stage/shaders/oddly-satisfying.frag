// note: 踊る人の画を 16 × 9 の小さな箱に分け、空の枠に上から 1 つずつ落として、跳ねずにぴたりとはめていく。6 秒で全部がはまり、少し見せてから空に戻す。
void main() {
  vec2 grid = vec2(16.0, 9.0);
  vec2 cell = floor(uv * grid);
  float phase = mod(time, 8.0);
  vec2 local = fract(uv * grid);
  vec3 c = vec3(0.92, 0.9, 0.86);
  vec2 slotEdge = abs(local - 0.5);
  c = mix(c, vec3(0.8, 0.78, 0.74), step(0.44, max(slotEdge.x, slotEdge.y)));
  for (int j = 0; j < 3; j++) {
    vec2 owner = cell - vec2(0.0, float(j));
    if (owner.y < 0.0) continue;
    float ord = (8.0 - owner.y) * 16.0 + mod(owner.x * 7.0, 16.0);
    float kk = clamp((phase - ord / 144.0 * 5.5) / 0.4, 0.0, 1.0);
    float off = (1.0 - (1.0 - pow(1.0 - kk, 3.0))) * (owner.y + 1.0) / grid.y;
    vec2 q = uv * grid + vec2(0.0, off * grid.y) - owner;
    if (kk > 0.0 && q.x >= 0.0 && q.x < 1.0 && q.y >= 0.0 && q.y < 1.0 && phase < 7.6) {
      vec2 at = (owner + q) / grid;
      vec3 piece = rgb(at) * (0.9 + 0.1 * step(0.06, min(min(q.x, q.y), min(1.0 - q.x, 1.0 - q.y))));
      c = piece;
    }
  }
  outColor = vec4(c, 1.0);
}
