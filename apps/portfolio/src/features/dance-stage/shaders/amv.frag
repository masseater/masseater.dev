// note: 拍ごとに、28 秒の動画のどこか別の場面へ切り替え、切り替えの直後だけ寄って戻すので、曲に合わせて場面を編集したように見せる。上下に黒い帯を入れ、色を映画風の青緑と橙に寄せる。
void main() {
  float shot = floor(beatCount);
  float offset = hash(vec2(shot, 2.0)) * 28.0;
  float punch = exp(-beat * 5.0) * 0.12;
  vec2 p = (uv - 0.5) / (1.0 + punch + 0.1 * step(0.5, hash(vec2(shot, 5.0)))) + 0.5;
  vec3 c = pastRgb(p, offset + beat);
  float l = luma(c);
  vec3 grade = mix(vec3(0.1, 0.3, 0.4), vec3(1.0, 0.75, 0.45), l);
  c = mix(c, grade * (0.3 + l), 0.5);
  c *= step(0.1, uv.y) * step(uv.y, 0.9);
  outColor = vec4(c, 1.0);
}
