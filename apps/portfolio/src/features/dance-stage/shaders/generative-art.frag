// note: 4 秒ごとに乱数の種を変え、円と線と四角を決まった規則で並べた絵を毎回新しく作る。色は踊りの画から拾い、踊る人の形の内側だけに図形を密に置く。
void main() {
  float seed = floor(time / 4.0);
  vec3 c = vec3(0.96, 0.94, 0.9);
  vec2 grid = vec2(16.0, 9.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid) - 0.5;
  float inBody = step(0.5, matte((cell + 0.5) / grid));
  float kind = floor(hash(cell + seed) * 4.0);
  vec3 col = rgb((cell + 0.5) / grid);
  col = mix(col, hsv(vec3(hash(cell + seed + 9.0), 0.6, 0.9)), 0.35);
  float shape = 0.0;
  if (kind < 1.0) shape = step(length(local * vec2(aspect() / grid.x * grid.y, 1.0)), 0.38);
  else if (kind < 2.0) shape = step(abs(local.x + local.y * (hash(cell + seed + 1.0) > 0.5 ? 1.0 : -1.0)), 0.08);
  else if (kind < 3.0) shape = step(max(abs(local.x), abs(local.y)), 0.3);
  else shape = step(abs(local.y), 0.4) * step(abs(local.x), 0.1);
  shape *= mix(step(0.75, hash(cell + seed + 5.0)), 1.0, inBody);
  c = mix(c, col, shape);
  outColor = vec4(c, 1.0);
}
