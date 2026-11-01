// note: 踊る人と部屋を細かな点の集まりに変え、明るさと人物の切り抜きから決めた奥行きで、見る向きをゆっくり左右に回したように点をずらす。黒い空間に点だけが浮かぶ。
void main() {
  vec2 grid = vec2(160.0, 90.0);
  vec2 cellSize = 1.0 / grid;
  float turn = sin(time * 0.6) * 0.5;
  vec3 c = vec3(0.0);
  vec2 base = floor(uv * grid);
  for (int dx = -4; dx <= 4; dx++) {
    vec2 cell = base + vec2(float(dx), 0.0);
    vec2 home = (cell + 0.5) * cellSize;
    float depth = matte(home) * 0.6 + (1.0 - luma(plate(home))) * 0.3;
    vec2 pos = home + vec2((depth - 0.4) * turn * 0.04, 0.0);
    float d = length((uv - pos) * grid);
    vec3 col = rgb(home) * (0.8 + 0.5 * depth);
    c = max(c, col * smoothstep(0.5, 0.3, d));
  }
  outColor = vec4(c, 1.0);
}
