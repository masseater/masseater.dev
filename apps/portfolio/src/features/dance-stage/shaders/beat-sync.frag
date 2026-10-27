// note: 音声から推定した拍に合わせて、画面を一瞬寄せて戻し、拍ごとに色の味付けを替える。
void main() {
  float punch = exp(-beat * 9.0);
  vec2 p = (uv - 0.5) / (1.0 + 0.12 * punch) + 0.5;
  vec3 c = rgb(p);
  float k = mod(beatCount, 4.0);
  vec3 tint = k < 1.0 ? vec3(1.1, 0.95, 0.9) : k < 2.0 ? vec3(0.9, 1.0, 1.15) : k < 3.0 ? vec3(1.15, 1.05, 0.8) : vec3(0.95, 1.1, 0.95);
  c *= tint;
  c += punch * 0.12;
  outColor = vec4(c, 1.0);
}
