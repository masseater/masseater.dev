// note: 手前に大きく写した踊る人の手のひらの上に、奥に小さく写した 5 秒前の踊る人を乗せる。距離の違う 2 人を重ねるだけで、小人が手の上で踊っているように見える。
void main() {
  vec2 big = (uv - vec2(0.75, 0.62)) / 1.7 + vec2(0.56, 0.45);
  vec3 c = blurPlate(uv, 0.002);
  float mb = matte(big) * inside(big);
  c = mix(c, rgb(big) * 0.9, mb);
  vec2 hand = vec2(0.33, 0.55);
  vec2 small = (uv - hand) / 0.22 + vec2(0.56, 0.92);
  float t = time - 5.0;
  float ms = pastMatte(small, t) * inside(small);
  c = mix(c, pastRgb(small, t), ms);
  outColor = vec4(c, 1.0);
}
