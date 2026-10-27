// note: 胴の中心をなめらかに追うカメラにする。中心の位置を毎フレーム少しずつ寄せて保存し、細かい揺れを消したまま人物について行く。
// pass: cam persistent
uniform sampler2D cam;
void main() {
  vec4 last = read(cam, vec2(0.5));
  vec2 target = bodyCenter();
  vec2 next = last.a < 0.5 ? target : mix(last.xy, target, 0.06);
  outColor = vec4(next, 0.0, 1.0);
}
// pass:
uniform sampler2D cam;
void main() {
  vec2 center = read(cam, vec2(0.5)).xy;
  vec2 p = (uv - 0.5) / 1.7 + center;
  outColor = vec4(rgbOr(p, vec3(0.08)), 1.0);
}
