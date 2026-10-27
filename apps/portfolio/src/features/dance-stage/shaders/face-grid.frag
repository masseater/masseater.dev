// note: 3×3 の格子に、少しずつ時間のずれた顔のアップを並べる。拍のたびに光る玉が隣のマスへ渡され、マスの外からマスの外へ受け渡しているように見せる。
void main() {
  vec2 grid = vec2(3.0, 3.0);
  vec2 cell = floor(uv * grid);
  vec2 local = fract(uv * grid);
  float t = time - hash(cell) * 0.15;
  vec2 head = joint(0);
  vec2 p = head + (local - 0.5) * vec2(0.3, 0.45);
  vec3 c = pastRgb(p, t);
  float order = mod(beatCount, 9.0);
  vec2 from = vec2(mod(order, 3.0), floor(order / 3.0));
  vec2 to = vec2(mod(order + 1.0, 3.0), floor(mod(order + 1.0, 9.0) / 3.0));
  vec2 ball = (mix(from, to, smoothstep(0.0, 1.0, min(beat * 2.0, 1.0))) + 0.5) / grid;
  c = mix(c, vec3(1.0, 0.85, 0.2), smoothstep(0.035, 0.025, dist(uv, ball)));
  float border = step(local.x, 0.01) + step(0.99, local.x) + step(local.y, 0.015) + step(0.985, local.y);
  c = mix(c, vec3(0.05), min(border, 1.0));
  outColor = vec4(c, 1.0);
}
