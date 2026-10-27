// note: 画面を 160×90 の粗い画素にし、色を 16 色に絞って細かい市松でぼかしの代わりにする。昔のゲーム機の画面のように見える。
void main() {
  vec3 palette[16] = vec3[16](vec3(0.0), vec3(0.11, 0.17, 0.33), vec3(0.49, 0.15, 0.33), vec3(0.0, 0.53, 0.32), vec3(0.67, 0.32, 0.21), vec3(0.37, 0.34, 0.31), vec3(0.76, 0.76, 0.78), vec3(1.0, 0.95, 0.91), vec3(1.0, 0.0, 0.3), vec3(1.0, 0.64, 0.0), vec3(1.0, 0.93, 0.15), vec3(0.0, 0.89, 0.21), vec3(0.16, 0.68, 1.0), vec3(0.51, 0.46, 0.61), vec3(1.0, 0.47, 0.66), vec3(1.0, 0.8, 0.67));
  vec2 grid = vec2(160.0, 90.0);
  vec2 cell = floor(uv * grid);
  vec3 target = rgb((cell + 0.5) / grid);
  target += (mod(cell.x + cell.y, 2.0) - 0.5) * 0.06;
  vec3 best = palette[0];
  float score = 9.0;
  for (int i = 0; i < 16; i++) {
    vec3 d = palette[i] - target;
    float e = dot(d, d);
    if (e < score) { score = e; best = palette[i]; }
  }
  outColor = vec4(best, 1.0);
}
