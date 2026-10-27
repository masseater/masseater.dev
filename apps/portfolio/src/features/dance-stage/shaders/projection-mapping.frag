// note: 夜の洋館の正面に踊る映像を映し、窓や柱の形はそのまま残す。拍のたびに壁のれんがが一つずつ前へ飛び出しては戻り、建物そのものが崩れて組み直されるように見せる。
void main() {
  vec3 c = mix(vec3(0.02, 0.03, 0.08), vec3(0.08, 0.08, 0.15), uv.y);
  vec2 b = (uv - vec2(0.15, 0.2)) / vec2(0.7, 0.75);
  float roof = step(b.y, 0.0) * step(abs(b.x - 0.5) * 0.5, b.y + 0.15);
  if (inside(b) < 0.5 && roof < 0.5) { outColor = vec4(c, 1.0); return; }
  vec2 brick = vec2(26.0, 18.0);
  vec2 bp = b;
  bp.x += mod(floor(bp.y * brick.y), 2.0) * 0.5 / brick.x;
  vec2 cell = floor(bp * brick);
  float pop = exp(-beat * 5.0) * step(0.75, hash(cell + beatCount));
  vec2 shift = (cell / brick - 0.5) * pop * 0.08;
  vec2 q = b - shift;
  vec2 local = fract(bp * brick);
  float mortar = step(local.x, 0.06) + step(local.y, 0.1);
  vec3 stone = vec3(0.25, 0.22, 0.2);
  vec3 projected = rgb(vec2(q.x, q.y * 0.9 + 0.05)) * (1.0 + pop * 0.8);
  vec3 face = mix(projected, stone * 0.5, min(mortar, 1.0) * 0.7);
  vec2 w = fract(b * vec2(5.0, 3.0));
  float window = step(0.3, w.x) * step(w.x, 0.7) * step(0.2, w.y) * step(w.y, 0.75) * step(0.15, b.y);
  face = mix(face, vec3(0.02), window * 0.85);
  face = mix(face, stone * 0.6 + projected * 0.3, roof);
  outColor = vec4(face, 1.0);
}
