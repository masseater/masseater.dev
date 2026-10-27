// note: 同じ大きさの黒い点だけで描く。画面を細かい格子に分けて各格子に点の候補を 1 つずつ散らし、暗い所ほど多くの候補に点を打つ。
void main() {
  vec2 px = uv * resolution / 4.0;
  float ink = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    vec2 cell = floor(px) + vec2(float(i), float(j));
    vec2 at = cell + vec2(hash(cell), hash(cell + 3.1));
    float dark = 1.0 - luma(rgb(at * 4.0 / resolution));
    float on = step(hash(cell + 9.7), pow(dark, 1.4) * 1.1);
    ink = max(ink, on * smoothstep(0.42, 0.3, length(px - at)));
  }
  outColor = vec4(mix(vec3(0.97, 0.95, 0.9), vec3(0.08), ink), 1.0);
}
