// note: 右手を銃に見立て、2 拍ごとに撃った瞬間だけ手首の先に星形の光を 0.05 秒出す。光が出たフレームだけ、周りの壁もわずかに明るくする。
void main() {
  vec3 c = rgb(uv);
  float on = step(mod(beatCount, 2.0), 0.5) * step(beat, 0.05);
  vec2 hand = joint(16);
  vec2 dir = normalize((joint(16) - joint(14)) * vec2(aspect(), 1.0) + 1e-4);
  vec2 tip = hand + dir / vec2(aspect(), 1.0) * 0.04;
  vec2 d = (uv - tip) * vec2(aspect(), 1.0);
  float a = atan(d.y, d.x);
  float star = smoothstep(0.08 * (0.5 + 0.5 * abs(cos(a * 3.0))), 0.0, length(d));
  c = c * (1.0 + 0.25 * on) + vec3(1.0, 0.8, 0.4) * star * on * 1.6;
  outColor = vec4(c, 1.0);
}
