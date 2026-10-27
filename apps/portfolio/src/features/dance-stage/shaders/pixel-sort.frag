// note: 明るい画素の並びを縦の帯として見つけ、帯の上端の色から下へ向かって明るさ順に流れるように塗り直す。
void main() {
  float threshold = 0.45 + 0.15 * sin(time * 0.7);
  vec2 px = vec2(0.0, 1.0 / resolution.y);
  float here = luma(rgb(uv));
  if (here < threshold) { outColor = vec4(rgb(uv), 1.0); return; }
  float top = uv.y;
  float bottom = uv.y;
  for (int i = 0; i < 90; i++) {
    if (luma(rgb(vec2(uv.x, top - px.y * 3.0))) < threshold || top < 0.0) break;
    top -= px.y * 3.0;
  }
  for (int i = 0; i < 90; i++) {
    if (luma(rgb(vec2(uv.x, bottom + px.y * 3.0))) < threshold || bottom > 1.0) break;
    bottom += px.y * 3.0;
  }
  float k = (uv.y - top) / max(bottom - top, 0.001);
  vec3 a = rgb(vec2(uv.x, top));
  vec3 b = rgb(vec2(uv.x, bottom));
  vec3 sorted = luma(a) > luma(b) ? mix(a, b, k) : mix(b, a, k);
  outColor = vec4(sorted, 1.0);
}
