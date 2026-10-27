// note: 斜め上の 1 灯で顔を照らし、暗い側の頬に三角形の光だけを残す。顔のまわり以外はほとんど闇に落とす。
void main() {
  vec3 c = rgb(uv);
  vec2 face = joint(0);
  vec2 q = (uv - face) * vec2(aspect(), 1.0);
  float key = smoothstep(0.02, -0.02, q.x);
  vec2 t = q - vec2(0.022, 0.015);
  float triangle = step(0.0, t.y) * step(t.y, 0.03) * step(abs(t.x), (0.03 - t.y) * 0.5);
  float light = max(key, triangle * 0.9) * smoothstep(0.16, 0.06, length(q));
  light += 0.25 * matte(uv) * smoothstep(0.4, 0.0, dist(uv, face));
  vec3 outc = c * light * 1.2 * vec3(1.05, 0.95, 0.85);
  outColor = vec4(outc, 1.0);
}
