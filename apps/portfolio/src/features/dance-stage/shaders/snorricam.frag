// note: 胴の中心と肩の傾きにカメラを固定する。人物は画面の真ん中に止まったまま、部屋のほうが揺れて回る。
void main() {
  vec2 center = bodyCenter();
  vec2 shoulder = joint(12) - joint(11);
  float a = atan(shoulder.y / (shoulder.x * aspect() + sign(shoulder.x) * 1e-4));
  vec2 q = (uv - 0.5) * vec2(aspect(), 1.0);
  q = rot(q, a);
  vec2 p = q / vec2(aspect(), 1.0) / 1.25 + center;
  outColor = vec4(rgbOr(p, vec3(0.05)), 1.0);
}
