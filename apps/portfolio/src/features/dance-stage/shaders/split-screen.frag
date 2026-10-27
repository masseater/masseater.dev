// note: 画面を縦に 3 つに分け、同じ踊りを 0.6 秒ずつずらして、それぞれ違う色の部屋で並べて見せる。
void main() {
  float panel = floor(uv.x * 3.0);
  float local = fract(uv.x * 3.0);
  vec2 p = vec2(local * 0.4 + 0.36, uv.y);
  vec3 c = pastRgb(p, time - panel * 0.6);
  float m = pastMatte(p, time - panel * 0.6);
  vec3 tints[3] = vec3[3](vec3(1.0, 0.75, 0.75), vec3(0.75, 1.0, 0.8), vec3(0.75, 0.8, 1.0));
  c = mix(c * tints[int(panel)], c, m);
  c = mix(c, vec3(0.05), step(local, 0.008) * step(0.5, panel) );
  outColor = vec4(c, 1.0);
}
