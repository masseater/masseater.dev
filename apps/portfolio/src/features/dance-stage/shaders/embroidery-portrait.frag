// note: 布の上に、色を 6 段に絞った糸の針目を重ねて描く。針目の向きは明るさの変わる向きに沿わせ、一目ずつに糸の膨らみの陰影を付ける。
void main() {
  vec2 grid = vec2(96.0, 54.0);
  vec2 cell = floor(uv * grid);
  vec2 center = (cell + 0.5) / grid;
  vec3 raw = rgb(center);
  float tone = luma(raw);
  vec3 color = raw * (floor(tone * 6.0 + 0.5) / 6.0) / max(tone, 0.02);
  float e = 1.0 / grid.y;
  vec2 g = vec2(luma(rgb(center + vec2(e, 0.0))) - luma(rgb(center - vec2(e, 0.0))), luma(rgb(center + vec2(0.0, e))) - luma(rgb(center - vec2(0.0, e))));
  float angle = atan(g.y, g.x) + PI * 0.5 + (hash(cell) - 0.5) * 0.4;
  vec2 q = rot((fract(uv * grid) - 0.5), -angle);
  float thread = 0.5 + 0.5 * cos(q.y * 3.0 * 2.0 * PI);
  float stitch = smoothstep(0.5, 0.35, abs(q.x));
  vec3 linen = vec3(0.85, 0.8, 0.7) * (0.9 + 0.1 * step(0.5, fract(uv.x * 300.0)) * step(0.5, fract(uv.y * 170.0)));
  vec3 c = mix(linen, color * (0.55 + 0.6 * thread), max(stitch, 0.75));
  outColor = vec4(c, 1.0);
}
