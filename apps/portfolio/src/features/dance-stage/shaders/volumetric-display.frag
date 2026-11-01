// note: 暗い部屋のガラスの箱の中に、踊る人の形を 6 枚の層に分けた光の点で浮かべる。見る向きがゆっくり回るので、層が前後にずれて立体に見える。
void main() {
  vec3 c = vec3(0.01, 0.01, 0.02);
  vec2 lo = vec2(0.28, 0.08);
  vec2 hi = vec2(0.72, 0.9);
  float turn = sin(time * 0.6);
  for (int k = 0; k < 6; k++) {
    float z = (float(k) - 2.5) / 2.5;
    vec2 shift = vec2(z * turn * 0.04, z * 0.01);
    vec2 p = uv - shift;
    vec2 g = vec2(120.0, 68.0);
    vec2 cell = (floor(p * g) + 0.5) / g;
    float d = length((p - cell) * g);
    float on = matte(cell) * step(abs(matte(cell) - 0.5), 0.5) * step(abs(float(k) - 2.5 - (hash(floor(p * g)) - 0.5) * 6.0), 1.0);
    vec3 col = mix(vec3(0.3, 0.7, 1.0), vec3(1.0, 0.5, 0.8), float(k) / 5.0);
    c += col * on * smoothstep(0.45, 0.1, d) * 1.2;
  }
  vec2 e = min(abs(uv - lo), abs(uv - hi));
  float box = step(lo.x, uv.x) * step(uv.x, hi.x) * step(lo.y, uv.y) * step(uv.y, hi.y);
  c += vec3(0.15, 0.2, 0.25) * box * step(min(e.x * aspect(), e.y), 0.003);
  c += vec3(0.02, 0.03, 0.05) * box;
  outColor = vec4(c, 1.0);
}
