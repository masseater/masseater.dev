// note: 踊りの中から 8 つの瞬間を選び、その瞬間だけを 0.5 秒ずつ番号付きで次々に並べる。同じ型の場面を集めて一気に見せるやり方。
void main() {
  float slot = mod(floor(time / 0.5), 8.0);
  float start = 1.3 + slot * 3.4;
  vec3 c = pastRgb(uv, start + fract(time / 0.5) * 0.5);
  float n = number(uv, vec2(0.05, 0.06), 0.1, slot + 1.0, 1);
  c = mix(c, vec3(1.0, 0.9, 0.2), n);
  outColor = vec4(c, 1.0);
}
