// note: 画面の真ん中に画面全体を 4 分の 1 の大きさではめ込み、その中へ寄り続ける。寄りきると一段外と同じ画に戻るので、どこまでも終わらない。
void main() {
  float s = pow(4.0, fract(time * 0.25));
  vec2 q = (uv - 0.5) / s;
  for (int i = 0; i < 6; i++) {
    if (max(abs(q.x), abs(q.y)) < 0.125) q *= 4.0;
  }
  vec3 c = rgb(q + 0.5);
  float frame = step(abs(max(abs(q.x), abs(q.y)) - 0.5), 0.004);
  outColor = vec4(mix(c, vec3(1.0), frame * 0.0), 1.0);
}
