// note: 踊る人の姿を 1 つの形として 12 × 7 の格子に複製し、中心から広がる波と曲の帯域で 1 つずつ大きさを変える。波は 2 秒で端まで届く。
void main() {
  vec2 grid = vec2(12.0, 7.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid) - 0.5;
  vec2 center = (cell + 0.5) / grid - 0.5;
  float d = length(center * vec2(aspect(), 1.0));
  int band = int(mod(cell.x + cell.y, 8.0));
  float s = 0.45 + 0.3 * sin(time * PI - d * 9.0) + 0.25 * bands[band];
  vec2 q = local / max(s, 0.05);
  vec2 at = bodyCenter() + q * vec2(0.42, 0.75);
  float m = matte(at) * step(abs(q.x), 0.5) * step(abs(q.y), 0.5);
  vec3 bg = mix(vec3(0.08, 0.09, 0.14), vec3(0.14, 0.12, 0.22), uv.y);
  vec3 tint = hsv(vec3(fract(d * 0.6 + time * 0.05), 0.45, 1.0));
  vec3 c = mix(bg, rgb(at) * 0.6 + tint * 0.4, m);
  outColor = vec4(c, 1.0);
}
