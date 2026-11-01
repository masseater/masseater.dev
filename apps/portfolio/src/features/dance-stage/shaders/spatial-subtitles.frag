// note: 頭の中の言葉を、画面の中の空間に置くように、右手首の近くに傾いた文字で浮かべて手の動きに少し遅れて付いていかせる。
// text: 次は右
// text: ここで回る
// text: 腕、もっと上
void main() {
  vec3 c = rgb(uv);
  int row = int(mod(floor(beatCount / 4.0), 3.0));
  vec2 anchor = mix(lastJoint(16), joint(16), 0.3) + vec2(0.08, -0.06);
  vec2 q = rot((uv - anchor) * vec2(aspect(), 1.0), -0.25) / vec2(aspect(), 1.0) + anchor;
  float t = textBox(q, anchor, 0.085, row);
  c = mix(c, vec3(0.05), textBox(q - vec2(0.003, 0.004), anchor, 0.085, row) * 0.6);
  c = mix(c, vec3(1.0), t);
  outColor = vec4(c, 1.0);
}
