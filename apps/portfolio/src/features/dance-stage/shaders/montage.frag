// note: 色も寄りも違う短いカットを 0.6 秒ずつ並べ、別々の瞬間をひと続きの流れとして見せる。
void main() {
  float cut = floor(time / 0.6);
  float k = mod(cut, 5.0);
  float t = cut * 2.3;
  vec2 p = uv;
  if (k == 1.0) p = (uv - 0.5) / 2.0 + joint(15);
  if (k == 2.0) p = vec2(1.0 - uv.x, uv.y);
  if (k == 3.0) p = (uv - 0.5) / 1.4 + vec2(0.5, 0.75);
  if (k == 4.0) p = (uv - 0.5) / 2.2 + joint(0);
  vec3 c = pastRgb(p, t + fract(time / 0.6) * 0.6);
  vec3 grade = k == 0.0 ? vec3(1.0) : k == 1.0 ? vec3(1.2, 1.0, 0.8) : k == 2.0 ? vec3(0.8, 1.0, 1.2) : k == 3.0 ? vec3(1.0, 1.15, 0.9) : vec3(1.1, 0.9, 1.1);
  outColor = vec4(c * grade, 1.0);
}
