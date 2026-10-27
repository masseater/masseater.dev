// note: ジュリア集合の模様を描き、形を決める数を右手首の位置で動かす。集合の内側にだけ踊りの映像を映し、外側は逃げ出すまでの回数で色を付ける。
void main() {
  vec2 z = (uv - 0.5) * vec2(aspect(), 1.0) * 2.6;
  vec2 hand = joint(16);
  vec2 k = vec2(-0.8 + (hand.x - 0.5) * 0.3, 0.156 + (hand.y - 0.5) * 0.3);
  float n = 0.0;
  for (int i = 0; i < 80; i++) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + k;
    if (dot(z, z) > 16.0) break;
    n += 1.0;
  }
  vec3 c = n >= 80.0 ? rgb(uv) : hsv(vec3(fract(n * 0.03 + time * 0.05), 0.75, smoothstep(0.0, 25.0, n)));
  outColor = vec4(c, 1.0);
}
