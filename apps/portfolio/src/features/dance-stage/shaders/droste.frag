// note: 部屋の壁に、この映像そのものを額に入れて掛け、その額の中にまた同じ額が入っているように、絵を少しずつ回しながら入れ子にする。入れ子の奥へ向かってゆっくり寄り続ける。
void main() {
  float scale = 0.32;
  vec2 center = vec2(0.6, 0.45);
  float z = fract(time / 3.0);
  vec2 p = (uv - center) * pow(scale, z) + center;
  vec3 c = rgb(p);
  for (int i = 0; i < 6; i++) {
    vec2 d = (p - center) / scale;
    vec2 r = rot(d * vec2(aspect(), 1.0), 0.2) / vec2(aspect(), 1.0) + center;
    vec2 edge = abs(p - center) / (scale * 0.5);
    if (max(edge.x, edge.y) > 1.0) break;
    float frameEdge = step(0.9, max(edge.x, edge.y));
    c = mix(rgb(r), vec3(0.75, 0.6, 0.3), frameEdge);
    p = r;
  }
  outColor = vec4(c, 1.0);
}
