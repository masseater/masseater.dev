// note: 人物の切り抜きの内側に、山と森の景色を描いて流し込み、外側は白く飛ばす。二重露光の写真のように体の形の中に別の景色が見える。
void main() {
  float top = joint(0).y - 0.08;
  float bottom = max(joint(27).y, joint(28).y);
  vec2 q = vec2(uv.x, clamp((uv.y - top) / max(bottom - top, 0.2), 0.0, 1.0));
  vec3 sky = mix(vec3(0.95, 0.75, 0.6), vec3(0.45, 0.55, 0.75), q.y);
  float m1 = step(0.35 + 0.15 * fbm(vec2(uv.x * 3.0 + time * 0.05, 1.0)), q.y);
  float m2 = step(0.6 + 0.1 * fbm(vec2(uv.x * 6.0 - time * 0.03, 3.0)), q.y);
  vec3 land = mix(sky, vec3(0.3, 0.35, 0.5), m1);
  land = mix(land, vec3(0.08, 0.15, 0.12), m2);
  float trees = step(0.6, fbm(vec2(uv.x * 40.0, 0.0))) * step(0.62, q.y);
  land = mix(land, vec3(0.05, 0.1, 0.08), trees);
  float m = matte(uv);
  vec3 face = vec3(luma(rgb(uv)));
  vec3 inside = mix(land, land * (0.6 + 0.6 * face), 0.5);
  vec3 c = mix(vec3(0.97), inside, m);
  outColor = vec4(c, 1.0);
}
