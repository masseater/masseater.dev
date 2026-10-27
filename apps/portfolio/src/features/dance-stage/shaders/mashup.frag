// note: 今の踊りと、左右を反転して色を替えた 2 秒前の踊りを、波打つ境目で分け合い、重なる所では両方を透かして混ぜる。
void main() {
  vec3 a = rgb(uv);
  vec3 b = pastRgb(vec2(1.0 - uv.x, uv.y), time - 2.0).gbr;
  float edge = 0.5 + 0.25 * sin(uv.y * 6.0 + time * 1.2);
  float k = smoothstep(edge - 0.08, edge + 0.08, uv.x);
  vec3 c = mix(a, b, k);
  c = mix(c, max(a, b), 0.25 * (1.0 - abs(k * 2.0 - 1.0)));
  outColor = vec4(c, 1.0);
}
