// note: 部屋と踊る人を、向きと大きさの違うぼやけた楕円の重なりで描き直す。楕円は奥行きに応じて左右にずれ、見る位置がゆっくり回り込むように動く。
void main() {
  vec2 grid = vec2(64.0, 36.0);
  vec2 base = floor(uv * grid);
  float turn = sin(time * 0.5);
  vec3 acc = vec3(0.0);
  float wsum = 0.0;
  for (int i = -2; i <= 2; i++) for (int j = -2; j <= 2; j++) {
    vec2 cell = base + vec2(float(i), float(j));
    vec2 jitter = vec2(hash(cell), hash(cell + 9.1));
    vec2 home = (cell + jitter) / grid;
    float depth = matte(home);
    vec2 center = home + vec2((depth - 0.3) * turn * 0.03, 0.0);
    float a = hash(cell + 3.3) * PI;
    vec2 d = rot((uv - center) * grid, a);
    vec2 s = vec2(0.6 + hash(cell + 5.5) * 1.2, 0.35 + hash(cell + 6.6) * 0.5);
    float w = exp(-dot(d / s, d / s));
    acc += rgb(home) * w;
    wsum += w;
  }
  vec3 c = acc / max(wsum, 1e-3);
  c *= smoothstep(0.0, 0.25, wsum);
  outColor = vec4(c, 1.0);
}
