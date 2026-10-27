// note: 人の形を拾って、体の内側だけに流れる縞の模様をまとわせ、骨格の線と体を囲む枠と関節の点を重ねる。枠は体の動きに少し遅れて追いつく。
void main() {
  vec3 c = rgb(uv) * 0.45;
  float m = matte(uv);
  float stripes = 0.5 + 0.5 * sin((uv.x + uv.y) * 80.0 - time * 6.0);
  vec3 skin = mix(vec3(0.1, 0.9, 0.8), vec3(0.9, 0.2, 0.8), stripes);
  c = mix(c, skin * (0.4 + 0.6 * luma(rgb(uv))) * 1.4, m);
  float sk = skeleton(uv);
  c = mix(c, vec3(1.0), smoothstep(0.004, 0.001, sk));
  vec2 lo = vec2(1.0);
  vec2 hi = vec2(0.0);
  int ids[7] = int[7](0, 15, 16, 27, 28, 11, 12);
  for (int i = 0; i < 7; i++) {
    vec2 j = mix(lastJoint(ids[i]), joint(ids[i]), 0.6);
    lo = min(lo, j);
    hi = max(hi, j);
    c = mix(c, vec3(1.0, 0.9, 0.2), smoothstep(0.012, 0.008, dist(uv, joint(ids[i]))));
  }
  lo -= vec2(0.03, 0.08);
  hi += vec2(0.03, 0.03);
  vec2 inB = step(lo, uv) * step(uv, hi);
  float boxEdge = inB.x * inB.y * (1.0 - step(lo.x + 0.003, uv.x) * step(uv.x, hi.x - 0.003) * step(lo.y + 0.005, uv.y) * step(uv.y, hi.y - 0.005));
  c = mix(c, vec3(0.2, 1.0, 0.4), boxEdge);
  outColor = vec4(c, 1.0);
}
