// note: 模様の繰り返す間隔を人物の所だけ少し縮めた 1 枚の絵である。画面の奥を見るように目の焦点をずらすと、模様の中から踊る人が浮かび上がる。
void main() {
  float period = 0.09;
  vec2 p = vec2(uv.x * aspect(), uv.y);
  float x = p.x;
  for (int i = 0; i < 24; i++) {
    if (x < period) break;
    float depth = matte(vec2((x - period * 0.5) / aspect(), uv.y));
    x -= period - depth * 0.012;
  }
  vec2 q = vec2(x, p.y);
  vec3 c = hsv(vec3(noise(q * 40.0), 0.6, 0.5 + 0.5 * noise(q * 80.0 + 3.0)));
  outColor = vec4(c, 1.0);
}
