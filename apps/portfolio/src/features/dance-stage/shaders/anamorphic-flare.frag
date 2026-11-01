// note: 右手首に持たせた光から、画面の端から端まで横一直線に伸びる青い光の線を出す。横に長いレンズで撮ったときの光り方である。
void main() {
  vec3 c = rgb(uv) * 0.85;
  vec2 light = joint(16);
  float dy = abs(uv.y - light.y);
  float dx = abs(uv.x - light.x);
  float streak = exp(-dy * 260.0) * exp(-dx * 1.2);
  c += vec3(0.35, 0.6, 1.0) * streak * 1.4;
  c += vec3(0.8, 0.9, 1.0) * 0.01 / (dist(uv, light) + 0.012);
  outColor = vec4(c, 1.0);
}
